import "@tanstack/react-start/server-only";
import { auth } from "#/lib/auth";
import {
  LINKEDIN_PUBLISH_SCOPES,
  THREADS_PUBLISH_SCOPES,
  TWITTER_PUBLISH_SCOPES,
} from "#/lib/auth";
import {
  SOCIAL_CONNECTION_PROVIDERS,
  type SocialConnectionProviderId,
} from "#/lib/social-connections";
import {
  getSocialConnectionProfile,
  listSocialConnectionRows,
} from "#/services/social-connections/server";

const THREADS_MEDIA_HOST = "https://graph.threads.net/v1.0";
const LINKEDIN_API_HOST = "https://api.linkedin.com";
const X_API_HOST = "https://api.x.com";
const LINKEDIN_VERSION = "202603";
const THREADS_TEXT_LIMIT = 500;

const REQUIRED_SCOPES: Record<SocialConnectionProviderId, readonly string[]> = {
  twitter: TWITTER_PUBLISH_SCOPES,
  linkedin: LINKEDIN_PUBLISH_SCOPES,
  threads: THREADS_PUBLISH_SCOPES,
};

const SUPPORTED_CONTENT: Record<SocialConnectionProviderId, string[]> = {
  twitter: ["text"],
  linkedin: ["text"],
  threads: ["text"],
};

const PLATFORM_LIMITATIONS: Record<SocialConnectionProviderId, string[]> = {
  twitter: ["Posting is limited to text-only posts in this app tool."],
  linkedin: ["Posting is limited to text-only member posts in this app tool."],
  threads: ["Posting is limited to text-only posts up to 500 characters."],
};

type SocialConnectionRow = Awaited<
  ReturnType<typeof listSocialConnectionRows>
>[number];

type PostingInput = {
  providerId: SocialConnectionProviderId;
  text?: string;
};

type NormalizedPostingInput = {
  providerId: SocialConnectionProviderId;
  text: string | null;
};

type PublishResult = {
  externalPostId: string;
  externalUrl: string | null;
  message: string | null;
  providerId: SocialConnectionProviderId;
  targetId: string | null;
};

type ResolvedConnection = {
  accessToken: string;
  accountId: string;
  expiresAt: Date | null;
  profile: Awaited<ReturnType<typeof getSocialConnectionProfile>>;
  providerId: SocialConnectionProviderId;
  scopes: string[];
};

function trimToNull(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function splitScopes(scope: string | null | undefined) {
  if (!scope) {
    return [];
  }

  return scope
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isExpired(value: Date | string | null | undefined) {
  const date = toDate(value);
  return date ? date.getTime() <= Date.now() : false;
}

function normalizePostingInput(input: PostingInput): NormalizedPostingInput {
  return {
    providerId: input.providerId,
    text: trimToNull(input.text),
  };
}

function isLinkedInHashtagBoundary(text: string, index: number) {
  const previous = index === 0 ? "" : text[index - 1]!;
  const next = index + 1 < text.length ? text[index + 1]! : "";

  const previousIsSafeBoundary =
    previous === "" || /\s|[([{'"“”‘’.,!?;:]/.test(previous);
  const nextStartsWord = /[A-Za-z0-9_]/.test(next);

  return previousIsSafeBoundary && nextStartsWord;
}

function escapeLinkedInCommentary(text: string) {
  let result = "";

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;

    if (char === "#" && isLinkedInHashtagBoundary(text, index)) {
      result += char;
      continue;
    }

    if (/[|{}@[\]()<>#\\*_~]/.test(char)) {
      result += `\\${char}`;
      continue;
    }

    result += char;
  }

  return result;
}

function getLatestRowsByProvider(rows: SocialConnectionRow[]) {
  const latestByProvider = new Map<SocialConnectionProviderId, SocialConnectionRow>();

  for (const row of rows) {
    const providerId = row.providerId as SocialConnectionProviderId;
    if (!latestByProvider.has(providerId)) {
      latestByProvider.set(providerId, row);
    }
  }

  return latestByProvider;
}

async function fetchJsonOrThrow<T>(
  input: URL | string,
  init: RequestInit,
  errorPrefix: string,
): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    let detail = `${response.status}`;

    try {
      const payload = (await response.json()) as { error?: unknown };
      detail =
        typeof payload.error === "string"
          ? payload.error
          : JSON.stringify(payload);
    } catch {
      try {
        detail = await response.text();
      } catch {
        detail = `${response.status}`;
      }
    }

    throw new Error(`${errorPrefix}: ${detail}`);
  }

  return (await response.json()) as T;
}

async function getFreshAccessToken(args: {
  accountId: string;
  headers: Headers;
  providerId: SocialConnectionProviderId;
  userId: string;
}) {
  return auth.api.getAccessToken({
    headers: args.headers,
    body: {
      providerId: args.providerId,
      accountId: args.accountId,
      userId: args.userId,
    },
  });
}

async function resolveConnection(args: {
  headers: Headers;
  providerId: SocialConnectionProviderId;
  row: SocialConnectionRow;
  userId: string;
}): Promise<ResolvedConnection> {
  const token = await getFreshAccessToken({
    headers: args.headers,
    accountId: args.row.accountId,
    providerId: args.providerId,
    userId: args.userId,
  });
  const accessToken = token?.accessToken ?? args.row.accessToken;
  const expiresAt = toDate(
    token?.accessTokenExpiresAt ?? args.row.accessTokenExpiresAt,
  );

  if (!accessToken) {
    throw new Error("No access token is available for this social connection.");
  }

  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    throw new Error(
      "The access token for this social connection has expired and must be reconnected.",
    );
  }

  const profile = await getSocialConnectionProfile({
    accessToken,
    accountId: args.row.accountId,
    providerId: args.providerId,
  });

  return {
    providerId: args.providerId,
    accountId: args.row.accountId,
    accessToken,
    scopes: splitScopes(args.row.scope),
    expiresAt,
    profile,
  };
}

function ensureRequiredScopes(connection: ResolvedConnection) {
  const missingScopes = REQUIRED_SCOPES[connection.providerId].filter(
    (scope) => !connection.scopes.includes(scope),
  );

  if (missingScopes.length > 0) {
    throw new Error(
      `The ${connection.providerId} connection is missing required scopes: ${missingScopes.join(", ")}.`,
    );
  }
}

async function publishThreadsPost(args: {
  accountId: string;
  accessToken: string;
  input: NormalizedPostingInput;
}): Promise<PublishResult> {
  if (!args.input.text) {
    throw new Error("Threads posting requires text.");
  }

  if (args.input.text.length > THREADS_TEXT_LIMIT) {
    throw new Error("Threads posts are limited to 500 characters.");
  }

  const body = new URLSearchParams();
  body.set("access_token", args.accessToken);
  body.set("media_type", "TEXT");
  body.set("text", args.input.text);

  const container = await fetchJsonOrThrow<{ id?: string }>(
    `${THREADS_MEDIA_HOST}/${args.accountId}/threads`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
    "Threads text container creation failed",
  );

  if (!container.id) {
    throw new Error("Threads did not return a media container ID.");
  }

  const publishBody = new URLSearchParams();
  publishBody.set("access_token", args.accessToken);
  publishBody.set("creation_id", container.id);

  const publishPayload = await fetchJsonOrThrow<{ id?: string }>(
    `${THREADS_MEDIA_HOST}/${args.accountId}/threads_publish`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: publishBody,
    },
    "Threads publish failed",
  );

  if (!publishPayload.id) {
    throw new Error("Threads did not return a published post ID.");
  }

  return {
    providerId: "threads",
    targetId: args.accountId,
    externalPostId: publishPayload.id,
    externalUrl: null,
    message: null,
  };
}

async function publishTwitterPost(args: {
  accountId: string;
  accessToken: string;
  input: NormalizedPostingInput;
  profileHandle: string | null;
}): Promise<PublishResult> {
  if (!args.input.text) {
    throw new Error("X posting requires text.");
  }

  const payload = await fetchJsonOrThrow<{
    data?: {
      id?: string;
    };
  }>(
    `${X_API_HOST}/2/tweets`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: args.input.text,
      }),
    },
    "X post creation failed",
  );

  if (!payload.data?.id) {
    throw new Error("X did not return a post ID.");
  }

  const handle = args.profileHandle?.startsWith("@")
    ? args.profileHandle.slice(1)
    : args.profileHandle;

  return {
    providerId: "twitter",
    targetId: args.accountId,
    externalPostId: payload.data.id,
    externalUrl: handle
      ? `https://x.com/${handle}/status/${payload.data.id}`
      : null,
    message: null,
  };
}

async function publishLinkedInPost(args: {
  accessToken: string;
  accountId: string;
  input: NormalizedPostingInput;
}): Promise<PublishResult> {
  if (!args.input.text) {
    throw new Error("LinkedIn posting requires text.");
  }

  const response = await fetch(`${LINKEDIN_API_HOST}/rest/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: `urn:li:person:${args.accountId}`,
      commentary: escapeLinkedInCommentary(args.input.text),
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`LinkedIn post creation failed: ${detail || response.status}`);
  }

  const postId = response.headers.get("x-restli-id");
  if (!postId) {
    throw new Error("LinkedIn did not return a post ID.");
  }

  return {
    providerId: "linkedin",
    targetId: args.accountId,
    externalPostId: postId,
    externalUrl: null,
    message: null,
  };
}

export async function getSocialPostingAccountsForUser(args: {
  headers: Headers;
  userId: string;
}) {
  const rows = await listSocialConnectionRows(args.userId);
  const latestByProvider = getLatestRowsByProvider(rows);

  const accounts = await Promise.all(
    SOCIAL_CONNECTION_PROVIDERS.map(async (provider) => {
      const row = latestByProvider.get(provider.id);
      if (!row) {
        return {
          providerId: provider.id,
          connected: false,
          ready: false,
          reconnectRequired: false,
          accountId: null,
          connectedAt: null,
          profile: null,
          scopes: [],
          missingScopes: [...REQUIRED_SCOPES[provider.id]],
          supportedContent: SUPPORTED_CONTENT[provider.id],
          limitations: PLATFORM_LIMITATIONS[provider.id],
          targets: [],
          notes: ["This account is not connected yet."],
        };
      }

      let reconnectRequired = false;
      let notes: string[] = [];
      let connection: ResolvedConnection | null = null;

      try {
        connection = await resolveConnection({
          headers: args.headers,
          providerId: provider.id,
          row,
          userId: args.userId,
        });
      } catch (error) {
        reconnectRequired = true;
        notes = [
          error instanceof Error
            ? error.message
            : "This account needs to be reconnected.",
        ];
      }

      const scopes = splitScopes(row.scope);
      const missingScopes = REQUIRED_SCOPES[provider.id].filter(
        (scope) => !scopes.includes(scope),
      );

      if (isExpired(row.accessTokenExpiresAt)) {
        reconnectRequired = true;
        notes.push("The stored access token has expired and must be refreshed.");
      }

      const ready =
        connection !== null &&
        !reconnectRequired &&
        missingScopes.length === 0;

      if (missingScopes.length > 0) {
        notes.push(`Missing scopes: ${missingScopes.join(", ")}.`);
      }

      if (ready) {
        notes.push("This account is ready to publish within the supported scope.");
      }

      return {
        providerId: provider.id,
        connected: true,
        ready,
        reconnectRequired,
        accountId: row.accountId,
        connectedAt: row.createdAt.toISOString(),
        profile: connection?.profile ?? null,
        scopes,
        missingScopes,
        supportedContent: SUPPORTED_CONTENT[provider.id],
        limitations: PLATFORM_LIMITATIONS[provider.id],
        targets: [],
        notes,
      };
    }),
  );

  return { accounts };
}

export async function publishSocialPostForUser(args: {
  headers: Headers;
  input: PostingInput;
  userId: string;
}) {
  const input = normalizePostingInput(args.input);
  const rows = await listSocialConnectionRows(args.userId);
  const row = getLatestRowsByProvider(rows).get(input.providerId);

  if (!row) {
    throw new Error(`The ${input.providerId} account is not connected.`);
  }

  const connection = await resolveConnection({
    headers: args.headers,
    providerId: input.providerId,
    row,
    userId: args.userId,
  });
  ensureRequiredScopes(connection);

  switch (input.providerId) {
    case "twitter":
      return publishTwitterPost({
        accountId: connection.accountId,
        accessToken: connection.accessToken,
        input,
        profileHandle: connection.profile?.handle ?? null,
      });
    case "linkedin":
      return publishLinkedInPost({
        accountId: connection.accountId,
        accessToken: connection.accessToken,
        input,
      });
    case "threads":
      return publishThreadsPost({
        accountId: connection.accountId,
        accessToken: connection.accessToken,
        input,
      });
  }

  throw new Error(`Unsupported social provider: ${input.providerId}`);
}
