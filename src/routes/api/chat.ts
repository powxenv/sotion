import {
  type UIMessage,
  convertToModelMessages,
  createIdGenerator,
  streamText,
  validateUIMessages,
} from "ai";
import { createFileRoute } from "@tanstack/react-router";
import { saveChatForRequest } from "#/services/chat/service";
import { resolveChatLanguageModelForRequest } from "#/services/chat/model";
import { createAuthorizedNotionMcpClientForRequest } from "#/services/notion-mcp/service";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const {
          id,
          chatId,
          messages,
          selectedModel,
        }: {
          id?: string;
          chatId?: string;
          messages: UIMessage[];
          selectedModel?: string;
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
        try {
          const tools = await mcpClient.tools();
          const validatedMessages = await validateUIMessages({
            messages,
            tools: tools as any,
          });

          await saveChatForRequest({
            request,
            chatId: resolvedChatId,
            messages: validatedMessages,
          });

          const model = await resolveChatLanguageModelForRequest(
            request,
            selectedModel,
          );

          const result = streamText({
            model,
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
