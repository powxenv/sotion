import {
  convertToModelMessages,
  createIdGenerator,
  streamText,
  validateUIMessages,
} from "ai";
import { createFileRoute } from "@tanstack/react-router";
import { createZhipu } from "zhipu-ai-provider";
import { saveChatForRequest, type ChatMessage } from "#/services/chat/service";
import { createAuthorizedNotionMcpClientForRequest } from "#/services/notion-mcp/service";

const zhipu = createZhipu({
  baseURL: "https://api.z.ai/api/paas/v4",
  apiKey: "",
});

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const {
          id,
          chatId,
          messages,
        }: {
          id?: string;
          chatId?: string;
          messages: ChatMessage[];
        } = await request.json();
        const resolvedChatId = chatId || id;

        if (!resolvedChatId) {
          return Response.json({ error: "missing_chat_id" }, { status: 400 });
        }

        const mcpClientResult =
          await createAuthorizedNotionMcpClientForRequest(request);

        if (!mcpClientResult.ok) {
          return Response.json(
            { error: "notion_mcp_required" },
            { status: 403 },
          );
        }

        const mcpClient = mcpClientResult.client;
        const tools = (await mcpClient.tools()) as any;
        const validatedMessages = (await validateUIMessages({
          messages,
          tools,
        })) as ChatMessage[];

        await saveChatForRequest({
          request,
          chatId: resolvedChatId,
          messages: validatedMessages,
        });

        const result = streamText({
          model: zhipu("glm-4.7-flashx"),
          tools,
          system:
            "You are a helpful assistant with access to the user's connected Notion MCP workspace. Use tools when they are necessary to answer accurately or perform actions in Notion.",
          messages: await convertToModelMessages(validatedMessages, {
            tools,
          }),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: validatedMessages,
          generateMessageId: createIdGenerator({
            prefix: "msg",
            size: 16,
          }),
          onFinish: async ({ messages: responseMessages }) => {
            await Promise.all([
              saveChatForRequest({
                request,
                chatId: resolvedChatId,
                messages: responseMessages,
              }),
              mcpClient?.close(),
            ]);
          },
        });
      },
    },
  },
});
