import { and, eq } from "drizzle-orm";
import { db } from "#/db";
import { aiProviderSetting, mcpConnection, onboardingState } from "#/db/schema";

const NOTION_MCP_PROVIDER = "notion-mcp";

export async function findOnboardingState(userId: string) {
  const [record] = await db
    .select()
    .from(onboardingState)
    .where(eq(onboardingState.userId, userId))
    .limit(1);

  return record ?? null;
}

export async function findConnectedNotionWorkspace(userId: string) {
  const [connection] = await db
    .select()
    .from(mcpConnection)
    .where(
      and(
        eq(mcpConnection.userId, userId),
        eq(mcpConnection.provider, NOTION_MCP_PROVIDER),
      ),
    )
    .limit(1);

  return connection ?? null;
}

export async function findAnyAiProviderSetting(userId: string) {
  const [setting] = await db
    .select({ id: aiProviderSetting.id })
    .from(aiProviderSetting)
    .where(eq(aiProviderSetting.userId, userId))
    .limit(1);

  return setting ?? null;
}
