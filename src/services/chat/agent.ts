import {
  stepCountIs,
  ToolLoopAgent,
  type LanguageModel,
  type PrepareStepFunction,
  type ToolSet,
  type UIMessage,
} from "ai";
import type { InferSelectModel } from "drizzle-orm";
import { notionWorkspace } from "#/db/schema";
import { buildChatAgentInstructions } from "#/services/chat/prompt";

const GET_SOCIAL_MEDIA_WORKSPACE_TOOL = "get_social_media_workspace";
const SET_SOCIAL_MEDIA_WORKSPACE_TOOL = "set_social_media_workspace";
const MAX_CHAT_STEPS = 20;

type SocialMediaWorkspaceRecord = InferSelectModel<typeof notionWorkspace>;

export type ChatMessage = UIMessage;
export type ChatMessagePart = ChatMessage["parts"][number];

export function createChatAgent(args: {
  model: LanguageModel;
  tools: ToolSet;
  workspace: SocialMediaWorkspaceRecord | null;
}) {
  return new ToolLoopAgent({
    model: args.model,
    instructions: buildChatAgentInstructions({ workspace: args.workspace }),
    tools: args.tools,
    stopWhen: stepCountIs(MAX_CHAT_STEPS),
    prepareStep: createWorkspacePrepareStep({
      hasSavedWorkspace: Boolean(args.workspace),
      tools: args.tools,
    }),
  });
}

function createWorkspacePrepareStep(args: {
  hasSavedWorkspace: boolean;
  tools: ToolSet;
}): PrepareStepFunction<ToolSet> | undefined {
  if (args.hasSavedWorkspace) {
    return;
  }

  const toolNames = Object.keys(args.tools) as Array<keyof ToolSet>;
  const notionToolNames = toolNames.filter((toolName) =>
    toolName.startsWith("notion-"),
  );

  if (notionToolNames.length === 0) {
    return;
  }

  const bootstrapTools = [
    GET_SOCIAL_MEDIA_WORKSPACE_TOOL,
    SET_SOCIAL_MEDIA_WORKSPACE_TOOL,
    ...notionToolNames,
  ] as Array<keyof ToolSet>;
  const saveWorkspaceTools = [
    SET_SOCIAL_MEDIA_WORKSPACE_TOOL,
    ...notionToolNames.filter(
      (toolName) => !toolName.startsWith("notion-create"),
    ),
  ] as Array<keyof ToolSet>;

  return ({ steps }) => {
    const toolResults = steps.flatMap((step) => step.toolResults);
    const workspaceLookup = toolResults.find(
      (result) => result.toolName === GET_SOCIAL_MEDIA_WORKSPACE_TOOL,
    );
    const workspaceSaved = toolResults.some(
      (result) => result.toolName === SET_SOCIAL_MEDIA_WORKSPACE_TOOL,
    );
    const workspaceCreated = toolResults.some((result) =>
      result.toolName.startsWith("notion-create"),
    );

    if (workspaceSaved || workspaceLookup?.output?.exists) {
      return;
    }

    if (!workspaceLookup) {
      return;
    }

    if (workspaceCreated) {
      return { activeTools: saveWorkspaceTools };
    }

    return { activeTools: bootstrapTools };
  };
}
