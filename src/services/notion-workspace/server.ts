import "@tanstack/react-start/server-only";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "#/db";
import { notionWorkspace } from "#/db/schema";

export const SOCIAL_MEDIA_WORKSPACE_PURPOSE = "social_media_management";

function normalizeNotionId(value: string) {
  return value.trim().replace(/^collection:\/\//i, "").replace(/^page:\/\//i, "");
}

export async function getSocialMediaWorkspaceForUser(userId: string) {
  const [workspace] = await db
    .select()
    .from(notionWorkspace)
    .where(
      and(
        eq(notionWorkspace.userId, userId),
        eq(notionWorkspace.purpose, SOCIAL_MEDIA_WORKSPACE_PURPOSE),
      ),
    )
    .limit(1);

  return workspace ?? null;
}

export async function saveSocialMediaWorkspaceForUser(args: {
  userId: string;
  pageId: string;
  databaseId: string;
  source?: "manual" | "agent_created" | "switched" | "reassigned";
}) {
  const now = new Date();

  await db
    .insert(notionWorkspace)
    .values({
      id: randomUUID(),
      userId: args.userId,
      purpose: SOCIAL_MEDIA_WORKSPACE_PURPOSE,
      pageId: normalizeNotionId(args.pageId),
      databaseId: normalizeNotionId(args.databaseId),
      source: args.source ?? "manual",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [notionWorkspace.userId, notionWorkspace.purpose],
      set: {
        pageId: normalizeNotionId(args.pageId),
        databaseId: normalizeNotionId(args.databaseId),
        source: args.source ?? "manual",
        updatedAt: now,
      },
    });

  return getSocialMediaWorkspaceForUser(args.userId);
}

export function formatSocialMediaWorkspaceForPrompt(
  workspace: typeof notionWorkspace.$inferSelect | null,
) {
  if (!workspace) {
    return [
      "No dedicated Notion social media workspace is saved for this user yet.",
      "If the user wants to manage social media content in Notion, create one dedicated page and one dedicated database with Notion MCP tools, then call `set_social_media_workspace` to save the resulting page ID and database ID.",
    ].join("\n");
  }

  return [
    "Saved default Notion social media workspace:",
    `- Page ID: ${workspace.pageId}`,
    `- Database ID: ${workspace.databaseId}`,
    `- Source: ${workspace.source}`,
  ].join("\n");
}
