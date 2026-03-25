import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "#/db";
import {
  mcpClientRegistration,
  mcpConnection,
  mcpOAuthState,
} from "#/db/schema";

export const NOTION_MCP_PROVIDER = "notion-mcp";
export const NOTION_MCP_SERVER_URL = "https://mcp.notion.com/mcp";
export const NOTION_MCP_ISSUER = new URL(NOTION_MCP_SERVER_URL).origin;

export type NotionMcpRegistration =
  typeof mcpClientRegistration.$inferSelect;
export type NotionMcpState = typeof mcpOAuthState.$inferSelect;

export async function findNotionMcpConnection(userId: string) {
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

export async function findNotionMcpRegistration(redirectUri: string) {
  const [registration] = await db
    .select()
    .from(mcpClientRegistration)
    .where(
      and(
        eq(mcpClientRegistration.provider, NOTION_MCP_PROVIDER),
        eq(mcpClientRegistration.issuer, NOTION_MCP_ISSUER),
        eq(mcpClientRegistration.redirectUri, redirectUri),
      ),
    )
    .limit(1);

  return registration ?? null;
}

export async function findNotionMcpState(userId: string, state?: string) {
  if (!state) {
    return null;
  }

  const [record] = await db
    .select()
    .from(mcpOAuthState)
    .where(
      and(
        eq(mcpOAuthState.provider, NOTION_MCP_PROVIDER),
        eq(mcpOAuthState.userId, userId),
        eq(mcpOAuthState.state, state),
        isNull(mcpOAuthState.usedAt),
        gt(mcpOAuthState.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return record ?? null;
}
