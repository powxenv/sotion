import { tool, type ToolSet } from "ai";
import { z } from "zod";
import {
  getSocialMediaWorkspaceForUser,
  saveSocialMediaWorkspaceForUser,
} from "#/services/notion-workspace/server";

export function createChatAppTools(args: { userId: string }): ToolSet {
  return {
    get_social_media_workspace: tool({
      description:
        "Retrieve the user's saved dedicated Notion social media workspace from the app database, including the default page ID and database ID.",
      inputSchema: z.object({}),
      execute: async () => {
        const workspace = await getSocialMediaWorkspaceForUser(args.userId);

        return {
          workspace,
          exists: Boolean(workspace),
        };
      },
    }),
    set_social_media_workspace: tool({
      description:
        "Insert or update the user's selected dedicated Notion social media workspace in the app database whenever the page or database changes, is switched, reassigned, or manually selected.",
      inputSchema: z.object({
        pageId: z.string().min(1),
        databaseId: z.string().min(1),
        source: z
          .enum(["manual", "agent_created", "switched", "reassigned"])
          .optional(),
      }),
      execute: async ({ pageId, databaseId, source }) => {
        return {
          workspace: await saveSocialMediaWorkspaceForUser({
            userId: args.userId,
            pageId,
            databaseId,
            source,
          }),
        };
      },
    }),
  };
}
