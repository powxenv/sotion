import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth } from "better-auth/plugins";
import type { OAuth2Tokens } from "@better-auth/core/oauth2";
import { db } from "#/db";
import { env } from "#/env";

const TWITTER_PUBLISH_SCOPES = ["tweet.write", "media.write"];
const LINKEDIN_PUBLISH_SCOPES = ["w_member_social"];
const FACEBOOK_PUBLISH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "pages_manage_metadata",
  "publish_video",
];
const INSTAGRAM_PUBLISH_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
];
const THREADS_PUBLISH_SCOPES = [
  "threads_basic",
  "threads_content_publish",
];
const TIKTOK_PUBLISH_SCOPES = ["video.publish"];

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
  facebook: {
    clientId: env.FACEBOOK_CLIENT_ID,
    clientSecret: env.FACEBOOK_CLIENT_SECRET,
    scope: FACEBOOK_PUBLISH_SCOPES,
    disableImplicitSignUp: true,
    disableSignUp: true,
  },
  tiktok: {
    clientKey: env.TIKTOK_CLIENT_KEY,
    clientSecret: env.TIKTOK_CLIENT_SECRET,
    scope: TIKTOK_PUBLISH_SCOPES,
    disableImplicitSignUp: true,
    disableSignUp: true,
  },
};

const genericOAuthProviders = [
  {
    providerId: "instagram",
    clientId: env.INSTAGRAM_CLIENT_ID,
    clientSecret: env.INSTAGRAM_CLIENT_SECRET,
    authorizationUrl: "https://www.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    scopes: INSTAGRAM_PUBLISH_SCOPES,
    disableImplicitSignUp: true,
    disableSignUp: true,
    authorizationUrlParams: {
      scope: INSTAGRAM_PUBLISH_SCOPES.join(","),
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
      const body = new FormData();
      body.set("client_id", env.INSTAGRAM_CLIENT_ID);
      body.set("client_secret", env.INSTAGRAM_CLIENT_SECRET);
      body.set("grant_type", "authorization_code");
      body.set("redirect_uri", redirectURI);
      body.set("code", code);

      const shortLivedResponse = unwrapMetaTokenPayload(
        await fetchJson<MetaTokenPayload | { data?: MetaTokenPayload[] }>(
          "https://api.instagram.com/oauth/access_token",
          {
            method: "POST",
            body,
          },
        ),
      );
      const longLivedResponse = await exchangeMetaLongLivedToken({
        accessToken: shortLivedResponse.access_token,
        clientSecret: env.INSTAGRAM_CLIENT_SECRET,
        exchangeUrl: "https://graph.instagram.com/access_token",
        grantType: "ig_exchange_token",
      });

      return {
        accessToken: longLivedResponse.access_token,
        tokenType: longLivedResponse.token_type,
        accessTokenExpiresAt: toExpiresAt(longLivedResponse.expires_in),
        scopes: INSTAGRAM_PUBLISH_SCOPES,
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

      const profileUrl = new URL("https://graph.instagram.com/me");
      profileUrl.searchParams.set(
        "fields",
        "user_id,username,name,profile_picture_url",
      );
      profileUrl.searchParams.set("access_token", tokens.accessToken);

      const profile = await fetchJson<{
        user_id: string;
        username?: string;
        name?: string;
        profile_picture_url?: string;
      }>(profileUrl);

      return {
        id: profile.user_id,
        name: profile.name ?? profile.username ?? "Instagram",
        email: null,
        emailVerified: false,
        image: profile.profile_picture_url,
      };
    },
  },
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
    },
  },
  socialProviders,
  plugins: [
    genericOAuth({ config: genericOAuthProviders }),
    tanstackStartCookies(),
  ],
});
