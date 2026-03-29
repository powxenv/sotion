import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth } from "better-auth/plugins";
import type { OAuth2Tokens } from "@better-auth/core/oauth2";
import { db } from "#/db";
import { env } from "#/env";
import { SOCIAL_CONNECTION_PROVIDERS } from "#/lib/social-connections";

export const TWITTER_PUBLISH_SCOPES = [
  "offline.access",
  "tweet.read",
  "tweet.write",
  "users.read",
  "media.write",
] satisfies string[];
export const LINKEDIN_PUBLISH_SCOPES = ["w_member_social"] satisfies string[];
export const THREADS_PUBLISH_SCOPES = [
  "threads_basic",
  "threads_content_publish",
] satisfies string[];

type MetaTokenPayload = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  permissions?: string;
  scope?: string;
  user_id?: string | number;
};

function toExpiresAt(expiresIn?: number) {
  if (typeof expiresIn !== "number") {
    return undefined;
  }

  return new Date(Date.now() + expiresIn * 1000);
}

function unwrapMetaTokenPayload(
  payload: MetaTokenPayload | { data?: MetaTokenPayload[] },
): MetaTokenPayload {
  if ("data" in payload && Array.isArray(payload.data) && payload.data[0]) {
    return payload.data[0];
  }

  return payload as MetaTokenPayload;
}

async function fetchJson<T>(
  input: URL | string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new Error(`OAuth request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

async function exchangeMetaLongLivedToken(args: {
  accessToken: string;
  clientSecret: string;
  exchangeUrl: string;
  grantType: string;
}) {
  const url = new URL(args.exchangeUrl);
  url.searchParams.set("grant_type", args.grantType);
  url.searchParams.set("client_secret", args.clientSecret);
  url.searchParams.set("access_token", args.accessToken);

  return fetchJson<MetaTokenPayload>(url);
}

const socialProviders = {
  notion: {
    clientId: env.NOTION_CLIENT_ID,
    clientSecret: env.NOTION_CLIENT_SECRET,
  },
  twitter: {
    clientId: env.X_CLIENT_ID,
    clientSecret: env.X_CLIENT_SECRET,
    scope: TWITTER_PUBLISH_SCOPES,
    disableImplicitSignUp: true,
    disableSignUp: true,
  },
  linkedin: {
    clientId: env.LINKEDIN_CLIENT_ID,
    clientSecret: env.LINKEDIN_CLIENT_SECRET,
    scope: LINKEDIN_PUBLISH_SCOPES,
    disableImplicitSignUp: true,
    disableSignUp: true,
  },
};

const genericOAuthProviders = [
  {
    providerId: "threads",
    clientId: env.THREADS_CLIENT_ID,
    clientSecret: env.THREADS_CLIENT_SECRET,
    authorizationUrl: "https://threads.net/oauth/authorize",
    tokenUrl: "https://graph.threads.net/oauth/access_token",
    scopes: THREADS_PUBLISH_SCOPES,
    disableImplicitSignUp: true,
    disableSignUp: true,
    // Threads expects scopes to be comma-separated instead of space-separated.
    authorizationUrlParams: {
      scope: THREADS_PUBLISH_SCOPES.join(","),
    },
    async getToken({
      code,
      redirectURI,
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string;
      deviceId?: string;
    }) {
      const body = new URLSearchParams({
        client_id: env.THREADS_CLIENT_ID,
        client_secret: env.THREADS_CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri: redirectURI,
        code,
      });

      const shortLivedResponse = unwrapMetaTokenPayload(
        await fetchJson<MetaTokenPayload | { data?: MetaTokenPayload[] }>(
          "https://graph.threads.net/oauth/access_token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body,
          },
        ),
      );
      const longLivedResponse = await exchangeMetaLongLivedToken({
        accessToken: shortLivedResponse.access_token,
        clientSecret: env.THREADS_CLIENT_SECRET,
        exchangeUrl: "https://graph.threads.net/access_token",
        grantType: "th_exchange_token",
      });

      return {
        accessToken: longLivedResponse.access_token,
        tokenType: longLivedResponse.token_type,
        accessTokenExpiresAt: toExpiresAt(longLivedResponse.expires_in),
        scopes: THREADS_PUBLISH_SCOPES,
        raw: {
          shortLived: shortLivedResponse,
          longLived: longLivedResponse,
        },
      } satisfies OAuth2Tokens;
    },
    async getUserInfo(tokens: OAuth2Tokens) {
      if (!tokens.accessToken) {
        return null;
      }

      const profileUrl = new URL("https://graph.threads.net/v1.0/me");
      profileUrl.searchParams.set(
        "fields",
        "id,username,name,threads_profile_picture_url",
      );
      profileUrl.searchParams.set("access_token", tokens.accessToken);

      const response = await fetch(profileUrl);

      if (!response.ok) {
        return null;
      }

      const profile = (await response.json()) as {
        id: string;
        username?: string;
        name?: string;
        threads_profile_picture_url?: string;
      };

      return {
        id: profile.id,
        name: profile.name ?? profile.username ?? "Threads",
        email: null,
        emailVerified: false,
        image: profile.threads_profile_picture_url,
      };
    },
  },
];

const trustedSocialProviders = SOCIAL_CONNECTION_PROVIDERS.map(
  (provider) => provider.id,
);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: false,
  },
  account: {
    accountLinking: {
      enabled: true,
      disableImplicitLinking: true,
      trustedProviders: trustedSocialProviders,
    },
  },
  socialProviders,
  plugins: [
    genericOAuth({ config: genericOAuthProviders }),
    tanstackStartCookies(),
  ],
});
