import { tool, type ToolSet } from "ai";
import { z } from "zod";
import {
  getSocialMediaWorkspaceForUser,
  saveSocialMediaWorkspaceForUser,
} from "#/services/notion-workspace/server";
import {
  getSocialPostingAccountsForUser,
  publishSocialPostForUser,
} from "#/services/social-posting/server";

const SOCIAL_PROVIDER_IDS = [
  "twitter",
  "linkedin",
  "threads",
] as const;

export function createChatAppTools(args: {
  headers: Headers;
  userId: string;
}): ToolSet {
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
    get_social_posting_accounts: tool({
      description:
        "Check which text-based social accounts are connected for this user, whether they are ready for posting right now, and whether any reconnect or missing permissions are blocking them.",
      inputSchema: z.object({}),
      execute: async () => {
        return getSocialPostingAccountsForUser({
          headers: args.headers,
          userId: args.userId,
        });
      },
    }),
    publish_social_post: tool({
      description:
        "Publish text content to a connected social platform. This tool requires explicit approval before execution and should only be used once the final text and target platform are confirmed.",
      inputSchema: z.object({
        providerId: z.enum(SOCIAL_PROVIDER_IDS),
        text: z.string().optional(),
      }),
      needsApproval: true,
      execute: async (input) => {
        return publishSocialPostForUser({
          headers: args.headers,
          input,
          userId: args.userId,
        });
      },
    }),
  };
}
