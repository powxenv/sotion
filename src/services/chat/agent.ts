import type { MCPClient } from "@ai-sdk/mcp";
import { ToolLoopAgent, stepCountIs, type LanguageModel } from "ai";
import type { InferAgentUIMessage } from "ai";

const CHAT_AGENT_INSTRUCTIONS =
  "You are a helpful assistant with access to the user's connected Notion workspace and any enabled web research MCP tools. Use tools whenever they help you answer accurately or take actions in Notion.";

const CHAT_AGENT_MAX_STEPS = 100;

export type ChatTools = Awaited<ReturnType<MCPClient["tools"]>>;

export function createChatAgent(args: {
  model: LanguageModel;
  tools: ChatTools;
}) {
  return new ToolLoopAgent({
    model: args.model,
    tools: args.tools,
    instructions: CHAT_AGENT_INSTRUCTIONS,
    stopWhen: stepCountIs(CHAT_AGENT_MAX_STEPS),
  });
}

export type ChatAgent = ReturnType<typeof createChatAgent>;
export type ChatMessage = InferAgentUIMessage<ChatAgent, Record<string, never>>;
export type ChatMessagePart = ChatMessage["parts"][number];
