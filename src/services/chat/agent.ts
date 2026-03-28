import { ToolLoopAgent, stepCountIs, type LanguageModel, type ToolSet } from "ai";
import type { InferAgentUIMessage } from "ai";

const CHAT_AGENT_MAX_STEPS = 100;

export type ChatTools = ToolSet;

export function createChatAgent(args: {
  instructions: string;
  model: LanguageModel;
  tools: ChatTools;
}) {
  return new ToolLoopAgent({
    model: args.model,
    tools: args.tools,
    instructions: args.instructions,
    stopWhen: stepCountIs(CHAT_AGENT_MAX_STEPS),
  });
}

export type ChatAgent = ReturnType<typeof createChatAgent>;
export type ChatMessage = InferAgentUIMessage<ChatAgent, Record<string, never>>;
export type ChatMessagePart = ChatMessage["parts"][number];
