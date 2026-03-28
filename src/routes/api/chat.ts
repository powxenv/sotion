import {
  createAgentUIStreamResponse,
  createIdGenerator,
  validateUIMessages,
} from "ai";
import type { MCPClient } from "@ai-sdk/mcp";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { auth } from "#/lib/auth";
import { filterPresetTools } from "#/lib/mcp-providers";
import {
  createChatAgent,
  type ChatMessage,
} from "#/services/chat/agent";
import { buildChatAgentInstructions } from "#/services/chat/prompt";
import {
  resolveChatLanguageModel,
  saveChat,
} from "#/services/chat/server";
import { createChatAppTools } from "#/services/chat/tools";
import { createEnabledMcpClientsForUser } from "#/services/mcp-settings/server";
import { createAuthorizedNotionMcpClient } from "#/services/notion-mcp/server";
import { getSocialMediaWorkspaceForUser } from "#/services/notion-workspace/server";

const chatRequestBodySchema = z.object({
  id: z.string().optional(),
  chatId: z.string().optional(),
  messages: z.array(z.looseObject({})),
  selectedModel: z.string().optional(),
});

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });

        if (!session) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { id, chatId, messages, selectedModel } =
          chatRequestBodySchema.parse(await request.json());
        const resolvedChatId = chatId || id;
        const mcpClients: MCPClient[] = [];

        if (!resolvedChatId) {
          return Response.json({ error: "missing_chat_id" }, { status: 400 });
        }

        const notionMcpClientResult =
          await createAuthorizedNotionMcpClient({
            userId: session.user.id,
            origin: new URL(request.url).origin,
          });

        if (!notionMcpClientResult.ok) {
          return Response.json(
            { error: "notion_mcp_required" },
            { status: 403 },
          );
        }

        mcpClients.push(notionMcpClientResult.client);

        try {
          const configuredMcpClients =
            await createEnabledMcpClientsForUser(session.user.id);
          mcpClients.push(...configuredMcpClients.map(({ client }) => client));

          const toolSets = await Promise.all(
            [
              {
                client: notionMcpClientResult.client,
                presetId: null,
                selectedFeatureIds: [],
              },
              ...configuredMcpClients,
            ].map(async (entry) => {
              const tools = await entry.client.tools();

              if (!entry.presetId) {
                return tools;
              }

              return filterPresetTools({
                presetId: entry.presetId,
                selectedFeatureIds: entry.selectedFeatureIds,
                tools,
              });
            }),
          );
          const workspace = await getSocialMediaWorkspaceForUser(
            session.user.id,
          );
          const tools = Object.assign(
            {},
            ...toolSets,
            createChatAppTools({ userId: session.user.id }),
          );
          const validatedMessages = await validateUIMessages<ChatMessage>({
            messages,
            tools,
          });

          await saveChat({
            userId: session.user.id,
            chatId: resolvedChatId,
            messages: validatedMessages,
          });

          const model = await resolveChatLanguageModel({
            userId: session.user.id,
            selectedModel,
          });

          const agent = createChatAgent({
            model,
            tools,
            instructions: buildChatAgentInstructions({ workspace }),
          });

          return await createAgentUIStreamResponse({
            agent,
            uiMessages: validatedMessages,
            originalMessages: validatedMessages,
            generateMessageId: createIdGenerator({
              prefix: "msg",
              size: 16,
            }),
            onFinish: async ({ messages: responseMessages }) => {
              await Promise.all([
                saveChat({
                  userId: session.user.id,
                  chatId: resolvedChatId,
                  messages: responseMessages,
                }),
                ...mcpClients.map((mcpClient) => mcpClient.close()),
              ]);
            },
          });
        } catch (error) {
          await Promise.allSettled(mcpClients.map((mcpClient) => mcpClient.close()));
          if (error instanceof Response) {
            return error;
          }
          throw error;
        }
      },
    },
  },
});
