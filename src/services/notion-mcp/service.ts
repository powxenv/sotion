import { auth as runMcpAuth } from "@ai-sdk/mcp";
import type {
  MCPClient,
  OAuthClientInformation,
  OAuthClientMetadata,
  OAuthClientProvider,
  OAuthTokens,
} from "@ai-sdk/mcp";
import { createMCPClient } from "@ai-sdk/mcp";
import { and, eq, isNull } from "drizzle-orm";
import { randomBytes, randomUUID } from "node:crypto";
import { db } from "#/db";
import {
  mcpClientRegistration,
  mcpConnection,
  mcpOAuthState,
} from "#/db/schema";
import { env } from "#/env";
import { decrypt, encrypt } from "#/lib/crypto";
import { requireSession } from "#/services/auth/session";
import {
  findNotionMcpConnection,
  findNotionMcpRegistration,
  findNotionMcpState,
  NOTION_MCP_ISSUER as ISSUER,
  NOTION_MCP_PROVIDER as PROVIDER,
  NOTION_MCP_SERVER_URL as SERVER_URL,
  type NotionMcpRegistration as RegistrationRecord,
  type NotionMcpState as StateRecord,
} from "#/services/notion-mcp/query";

const CALLBACK_PATH = "/api/integrations/notion/callback";
const DEFAULT_RETURN_TO = "/app";
const MCP_ENCRYPTION_KEY = env.MCP_ENCRYPTION_KEY;

export type NotionMcpStatus = {
  connected: boolean;
  hasConnectedBefore: boolean;
  authorizationRequired: boolean;
  status: string;
  accessTokenExpiresAt: string | null;
  lastError: string | null;
};

export type AuthorizedNotionMcpClientResult =
  | { ok: true; client: MCPClient }
  | { ok: false };

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
  let cachedRegistration: RegistrationRecord | null | undefined;
  let cachedState: StateRecord | null | undefined;

  const loadRegistration = async () => {
    if (cachedRegistration !== undefined) {
      return cachedRegistration;
    }

    cachedRegistration = await findNotionMcpRegistration(redirectUri);
    return cachedRegistration;
  };

  const loadState = async () => {
    if (cachedState !== undefined) {
      return cachedState;
    }

    cachedState = await findNotionMcpState(args.userId, args.callbackState);
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
          provider: PROVIDER,
          userId: args.userId,
          registrationId: registration?.id || null,
          serverUrl: SERVER_URL,
          resourceUrl: SERVER_URL,
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
            serverUrl: SERVER_URL,
            resourceUrl: SERVER_URL,
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
            eq(mcpOAuthState.provider, PROVIDER),
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
          provider: PROVIDER,
          issuer: ISSUER,
          serverUrl: SERVER_URL,
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
            serverUrl: SERVER_URL,
            clientId: clientInformation.client_id,
            clientSecret: encrypt(
              clientInformation.client_secret,
              MCP_ENCRYPTION_KEY,
            ),
            tokenEndpointAuthMethod: "none",
            updatedAt: now,
          },
        });

      cachedRegistration = await findNotionMcpRegistration(redirectUri);
    },
    async state() {
      return randomBytes(24).toString("base64url");
    },
    async saveState(state) {
      pendingState = state;

      await db.insert(mcpOAuthState).values({
        id: randomUUID(),
        provider: PROVIDER,
        userId: args.userId,
        state,
        redirectUri,
        serverUrl: SERVER_URL,
        resourceUrl: SERVER_URL,
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
              eq(mcpConnection.provider, PROVIDER),
            ),
          );
      }

      if (scope === "all" || scope === "client") {
        await db
          .delete(mcpClientRegistration)
          .where(
            and(
              eq(mcpClientRegistration.provider, PROVIDER),
              eq(mcpClientRegistration.issuer, ISSUER),
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
              eq(mcpOAuthState.provider, PROVIDER),
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

export async function getNotionMcpStatusForRequest(
  request: Request,
): Promise<NotionMcpStatus> {
  const session = await requireSession(request);
  const connection = await findNotionMcpConnection(session.user.id);

  return {
    connected:
      connection?.status === "connected" && Boolean(connection.accessToken),
    hasConnectedBefore: Boolean(connection?.connectedAt),
    authorizationRequired:
      !connection ||
      connection.status === "authorization_required" ||
      !connection.accessToken,
    status: connection?.status || "disconnected",
    accessTokenExpiresAt:
      connection?.accessTokenExpiresAt?.toISOString() || null,
    lastError: connection?.lastError || null,
  };
}

export async function createAuthorizedNotionMcpClientForRequest(
  request: Request,
): Promise<AuthorizedNotionMcpClientResult> {
  const session = await requireSession(request);
  const connection = await findNotionMcpConnection(session.user.id);

  if (connection?.status !== "connected" || !connection.accessToken) {
    return { ok: false };
  }

  const flow = createProvider({
    userId: session.user.id,
    origin: new URL(request.url).origin,
  });

  const client = await createMCPClient({
    transport: {
      type: "http",
      url: SERVER_URL,
      authProvider: flow.provider,
    },
  });

  return {
    ok: true,
    client,
  };
}

export async function beginNotionMcpConnection(
  request: Request,
  returnTo?: string,
) {
  const session = await requireSession(request);
  const flow = createProvider({
    userId: session.user.id,
    origin: new URL(request.url).origin,
    returnTo,
  });

  const result = await runMcpAuth(flow.provider, {
    serverUrl: SERVER_URL,
  });

  if (result === "AUTHORIZED") {
    return {
      type: "connected" as const,
      redirectTo: sanitizeReturnTo(returnTo),
    };
  }

  return {
    type: "redirect" as const,
    authorizationUrl: flow.getAuthorizationUrl(),
  };
}

export async function completeNotionMcpConnection(
  request: Request,
  authorizationCode: string,
  callbackState: string | undefined,
) {
  const session = await requireSession(request);
  const flow = createProvider({
    userId: session.user.id,
    origin: new URL(request.url).origin,
    callbackState,
  });

  const result = await runMcpAuth(flow.provider, {
    serverUrl: SERVER_URL,
    authorizationCode,
    callbackState,
  });

  if (result !== "AUTHORIZED") {
    throw new Error("Authorization did not complete.");
  }

  return flow.getReturnTo();
}

export async function disconnectNotionMcpForRequest(request: Request) {
  const session = await requireSession(request);
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
          eq(mcpConnection.userId, session.user.id),
          eq(mcpConnection.provider, PROVIDER),
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
          eq(mcpOAuthState.userId, session.user.id),
          eq(mcpOAuthState.provider, PROVIDER),
          isNull(mcpOAuthState.usedAt),
        ),
      );
  });

  return { success: true };
}
