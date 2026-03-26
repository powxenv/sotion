import "@tanstack/react-start/server-only";
import { auth as runMcpAuth } from "@ai-sdk/mcp";
import type {
  MCPClient,
  OAuthClientInformation,
  OAuthClientMetadata,
  OAuthClientProvider,
  OAuthTokens,
} from "@ai-sdk/mcp";
import { createMCPClient } from "@ai-sdk/mcp";
import { and, eq, gt, isNull } from "drizzle-orm";
import { randomBytes, randomUUID } from "node:crypto";
import { db } from "#/db";
import {
  mcpClientRegistration,
  mcpConnection,
  mcpOAuthState,
} from "#/db/schema";
import { env } from "#/env";
import { decrypt, encrypt } from "#/lib/crypto";

const CALLBACK_PATH = "/api/integrations/notion/callback";
const DEFAULT_RETURN_TO = "/app";
const MCP_ENCRYPTION_KEY = env.MCP_ENCRYPTION_KEY;

const NOTION_MCP_PROVIDER = "notion-mcp";
const NOTION_MCP_SERVER_URL = "https://mcp.notion.com/mcp";
const NOTION_MCP_ISSUER = new URL(NOTION_MCP_SERVER_URL).origin;

type NotionMcpRegistration = typeof mcpClientRegistration.$inferSelect;
type NotionMcpState = typeof mcpOAuthState.$inferSelect;

export type NotionMcpStatus = {
  connected: boolean;
  hasConnectedBefore: boolean;
  authorizationRequired: boolean;
  lastError: string | null;
};

async function findNotionMcpConnection(userId: string) {
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

function sanitizeReturnTo(returnTo?: string | null) {
  if (!returnTo) {
    return DEFAULT_RETURN_TO;
  }

  try {
    const url = new URL(returnTo, "http://localhost");

    if (url.origin !== "http://localhost") {
      return DEFAULT_RETURN_TO;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_RETURN_TO;
  }
}

function createProvider(args: {
  userId: string;
  origin: string;
  returnTo?: string;
  callbackState?: string;
}) {
  const redirectUri = new URL(CALLBACK_PATH, args.origin).toString();
  let authorizationUrl: string | null = null;
  let pendingState: string | null = null;
  let cachedRegistration: NotionMcpRegistration | null | undefined;
  let cachedState: NotionMcpState | null | undefined;

  const loadRegistration = async () => {
    if (cachedRegistration !== undefined) {
      return cachedRegistration;
    }

    const [record] = await db
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

    cachedRegistration = record ?? null;
    return cachedRegistration;
  };

  const loadState = async () => {
    if (cachedState !== undefined) {
      return cachedState;
    }

    if (!args.callbackState) {
      cachedState = null;
      return cachedState;
    }

    const [record] = await db
      .select()
      .from(mcpOAuthState)
      .where(
        and(
          eq(mcpOAuthState.provider, NOTION_MCP_PROVIDER),
          eq(mcpOAuthState.userId, args.userId),
          eq(mcpOAuthState.state, args.callbackState),
          isNull(mcpOAuthState.usedAt),
          gt(mcpOAuthState.expiresAt, new Date()),
        ),
      )
      .limit(1);

    cachedState = record ?? null;
    return cachedState;
  };

  const provider: OAuthClientProvider = {
    get redirectUrl() {
      return redirectUri;
    },
    get clientMetadata(): OAuthClientMetadata {
      return {
        client_name: "Sotion Notion MCP",
        redirect_uris: [redirectUri],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      };
    },
    async tokens(): Promise<OAuthTokens | undefined> {
      const connection = await findNotionMcpConnection(args.userId);

      if (!connection?.accessToken) {
        return undefined;
      }

      const expiresIn = connection.accessTokenExpiresAt
        ? Math.max(
            0,
            Math.floor(
              (connection.accessTokenExpiresAt.getTime() - Date.now()) / 1000,
            ),
          )
        : undefined;

      return {
        access_token: decrypt(connection.accessToken, MCP_ENCRYPTION_KEY) || "",
        refresh_token:
          decrypt(connection.refreshToken, MCP_ENCRYPTION_KEY) || undefined,
        token_type: connection.tokenType || "Bearer",
        scope: connection.scope || undefined,
        expires_in: expiresIn,
      };
    },
    async saveTokens(tokens) {
      const now = new Date();
      const registration = await loadRegistration();
      const state = await loadState();

      await db
        .insert(mcpConnection)
        .values({
          id: randomUUID(),
          provider: NOTION_MCP_PROVIDER,
          userId: args.userId,
          registrationId: registration?.id || null,
          serverUrl: NOTION_MCP_SERVER_URL,
          resourceUrl: NOTION_MCP_SERVER_URL,
          accessToken: encrypt(tokens.access_token, MCP_ENCRYPTION_KEY),
          refreshToken: encrypt(tokens.refresh_token, MCP_ENCRYPTION_KEY),
          tokenType: tokens.token_type || "Bearer",
          scope: tokens.scope || null,
          status: "connected",
          accessTokenExpiresAt: tokens.expires_in
            ? new Date(now.getTime() + tokens.expires_in * 1000)
            : null,
          connectedAt: now,
          lastError: null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [mcpConnection.userId, mcpConnection.provider],
          set: {
            registrationId: registration?.id || null,
            serverUrl: NOTION_MCP_SERVER_URL,
            resourceUrl: NOTION_MCP_SERVER_URL,
            accessToken: encrypt(tokens.access_token, MCP_ENCRYPTION_KEY),
            refreshToken: encrypt(tokens.refresh_token, MCP_ENCRYPTION_KEY),
            tokenType: tokens.token_type || "Bearer",
            scope: tokens.scope || null,
            status: "connected",
            accessTokenExpiresAt: tokens.expires_in
              ? new Date(now.getTime() + tokens.expires_in * 1000)
              : null,
            connectedAt: now,
            lastError: null,
            updatedAt: now,
          },
        });

      if (state) {
        await db
          .update(mcpOAuthState)
          .set({
            usedAt: now,
            updatedAt: now,
          })
          .where(eq(mcpOAuthState.id, state.id));

        cachedState = {
          ...state,
          usedAt: now,
        };
      }
    },
    async redirectToAuthorization(url) {
      authorizationUrl = url.toString();
    },
    async saveCodeVerifier(codeVerifier) {
      if (!pendingState) {
        throw new Error("Missing pending state.");
      }

      await db
        .update(mcpOAuthState)
        .set({
          codeVerifier: encrypt(codeVerifier, MCP_ENCRYPTION_KEY),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(mcpOAuthState.provider, NOTION_MCP_PROVIDER),
            eq(mcpOAuthState.userId, args.userId),
            eq(mcpOAuthState.state, pendingState),
            isNull(mcpOAuthState.usedAt),
          ),
        );
    },
    async codeVerifier() {
      const state = await loadState();
      const codeVerifier = decrypt(state?.codeVerifier, MCP_ENCRYPTION_KEY);

      if (!codeVerifier) {
        throw new Error("Missing code verifier.");
      }

      return codeVerifier;
    },
    async clientInformation(): Promise<OAuthClientInformation | undefined> {
      const registration = await loadRegistration();

      if (!registration) {
        return undefined;
      }

      return {
        client_id: registration.clientId,
        client_secret:
          decrypt(registration.clientSecret, MCP_ENCRYPTION_KEY) || undefined,
      };
    },
    async saveClientInformation(clientInformation) {
      const now = new Date();

      await db
        .insert(mcpClientRegistration)
        .values({
          id: randomUUID(),
          provider: NOTION_MCP_PROVIDER,
          issuer: NOTION_MCP_ISSUER,
          serverUrl: NOTION_MCP_SERVER_URL,
          redirectUri,
          clientId: clientInformation.client_id,
          clientSecret: encrypt(
            clientInformation.client_secret,
            MCP_ENCRYPTION_KEY,
          ),
          tokenEndpointAuthMethod: "none",
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            mcpClientRegistration.provider,
            mcpClientRegistration.issuer,
            mcpClientRegistration.redirectUri,
          ],
          set: {
            serverUrl: NOTION_MCP_SERVER_URL,
            clientId: clientInformation.client_id,
            clientSecret: encrypt(
              clientInformation.client_secret,
              MCP_ENCRYPTION_KEY,
            ),
            tokenEndpointAuthMethod: "none",
            updatedAt: now,
          },
        });

      cachedRegistration = undefined;
      cachedRegistration = await loadRegistration();
    },
    async state() {
      return randomBytes(24).toString("base64url");
    },
    async saveState(state) {
      pendingState = state;

      await db.insert(mcpOAuthState).values({
        id: randomUUID(),
        provider: NOTION_MCP_PROVIDER,
        userId: args.userId,
        state,
        redirectUri,
        serverUrl: NOTION_MCP_SERVER_URL,
        resourceUrl: NOTION_MCP_SERVER_URL,
        codeVerifier: null,
        returnTo: sanitizeReturnTo(args.returnTo),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
    },
    async storedState() {
      const state = await loadState();
      return state?.state;
    },
    async invalidateCredentials(scope) {
      const now = new Date();

      if (scope === "all" || scope === "tokens") {
        await db
          .update(mcpConnection)
          .set({
            accessToken: null,
            refreshToken: null,
            tokenType: null,
            scope: null,
            status: "authorization_required",
            accessTokenExpiresAt: null,
            lastError: "Authorization is required.",
            updatedAt: now,
          })
          .where(
            and(
              eq(mcpConnection.userId, args.userId),
              eq(mcpConnection.provider, NOTION_MCP_PROVIDER),
            ),
          );
      }

      if (scope === "all" || scope === "client") {
        await db
          .delete(mcpClientRegistration)
          .where(
            and(
              eq(mcpClientRegistration.provider, NOTION_MCP_PROVIDER),
              eq(mcpClientRegistration.issuer, NOTION_MCP_ISSUER),
              eq(mcpClientRegistration.redirectUri, redirectUri),
            ),
          );

        cachedRegistration = null;
      }

      if (scope === "all" || scope === "verifier") {
        await db
          .update(mcpOAuthState)
          .set({
            usedAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(mcpOAuthState.provider, NOTION_MCP_PROVIDER),
              eq(mcpOAuthState.userId, args.userId),
              isNull(mcpOAuthState.usedAt),
            ),
          );
      }
    },
  };

  return {
    provider,
    getAuthorizationUrl: () => authorizationUrl,
    getReturnTo: async () => {
      const state = await loadState();
      return state?.returnTo || DEFAULT_RETURN_TO;
    },
  };
}

export async function createAuthorizedNotionMcpClient(args: {
  userId: string;
  origin: string;
}): Promise<{ ok: true; client: MCPClient } | { ok: false }> {
  const connection = await findNotionMcpConnection(args.userId);

  if (connection?.status !== "connected" || !connection.accessToken) {
    return { ok: false };
  }

  const flow = createProvider({
    userId: args.userId,
    origin: args.origin,
  });

  const client = await createMCPClient({
    transport: {
      type: "http",
      url: NOTION_MCP_SERVER_URL,
      authProvider: flow.provider,
    },
  });

  return {
    ok: true,
    client,
  };
}

export async function beginNotionMcpConnection(args: {
  userId: string;
  origin: string;
  returnTo?: string;
}) {
  const flow = createProvider({
    userId: args.userId,
    origin: args.origin,
    returnTo: args.returnTo,
  });

  const result = await runMcpAuth(flow.provider, {
    serverUrl: NOTION_MCP_SERVER_URL,
  });

  if (result === "AUTHORIZED") {
    return {
      type: "connected" as const,
      redirectTo: sanitizeReturnTo(args.returnTo),
    };
  }

  return {
    type: "redirect" as const,
    authorizationUrl: flow.getAuthorizationUrl(),
  };
}

export async function completeNotionMcpConnection(args: {
  userId: string;
  origin: string;
  authorizationCode: string;
  callbackState?: string;
}) {
  const flow = createProvider({
    userId: args.userId,
    origin: args.origin,
    callbackState: args.callbackState,
  });

  const result = await runMcpAuth(flow.provider, {
    serverUrl: NOTION_MCP_SERVER_URL,
    authorizationCode: args.authorizationCode,
    callbackState: args.callbackState,
  });

  if (result !== "AUTHORIZED") {
    throw new Error("Authorization did not complete.");
  }

  return flow.getReturnTo();
}

export async function getNotionMcpStatusForUser(
  userId: string,
): Promise<NotionMcpStatus> {
  const connection = await findNotionMcpConnection(userId);

  return {
    connected:
      connection?.status === "connected" && Boolean(connection.accessToken),
    hasConnectedBefore: Boolean(connection?.connectedAt),
    authorizationRequired:
      !connection ||
      connection.status === "authorization_required" ||
      !connection.accessToken,
    lastError: connection?.lastError || null,
  };
}

export async function disconnectNotionMcpForUser(userId: string) {
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(mcpConnection)
      .set({
        accessToken: null,
        refreshToken: null,
        tokenType: null,
        scope: null,
        status: "disconnected",
        accessTokenExpiresAt: null,
        lastError: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(mcpConnection.userId, userId),
          eq(mcpConnection.provider, NOTION_MCP_PROVIDER),
        ),
      );

    await tx
      .update(mcpOAuthState)
      .set({
        usedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(mcpOAuthState.userId, userId),
          eq(mcpOAuthState.provider, NOTION_MCP_PROVIDER),
          isNull(mcpOAuthState.usedAt),
        ),
      );
  });

  return { success: true };
}
