import {
  createAgentUIStreamResponse,
  createIdGenerator,
  validateUIMessages,
} from "ai";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { auth } from "#/lib/auth";
import {
  createChatAgent,
  type ChatMessage,
} from "#/services/chat/agent";
import {
  resolveChatLanguageModel,
  saveChat,
} from "#/services/chat/funcs";
import { createAuthorizedNotionMcpClient } from "#/services/notion-mcp/funcs";

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

        if (!resolvedChatId) {
          return Response.json({ error: "missing_chat_id" }, { status: 400 });
        }

        const mcpClientResult =
          await createAuthorizedNotionMcpClient({
            userId: session.user.id,
            origin: new URL(request.url).origin,
          });

        if (!mcpClientResult.ok) {
          return Response.json(
            { error: "notion_mcp_required" },
            { status: 403 },
          );
        }

        const mcpClient = mcpClientResult.client;
        try {
          const tools = await mcpClient.tools();
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

          const agent = createChatAgent({ model, tools });

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
                mcpClient.close(),
              ]);
            },
          });
        } catch (error) {
          await mcpClient.close();
          if (error instanceof Response) {
            return error;
          }
          throw error;
        }
      },
    },
  },
});
