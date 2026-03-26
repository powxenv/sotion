import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth } from "better-auth/plugins";
import type { OAuth2Tokens } from "@better-auth/core/oauth2";
import { db } from "#/db";
import { env } from "#/env";

const socialProviders = {
  notion: {
    clientId: env.NOTION_CLIENT_ID,
    clientSecret: env.NOTION_CLIENT_SECRET,
  },
  twitter: {
    clientId: env.X_CLIENT_ID,
    clientSecret: env.X_CLIENT_SECRET,
    disableImplicitSignUp: true,
    disableSignUp: true,
  },
  linkedin: {
    clientId: env.LINKEDIN_CLIENT_ID,
    clientSecret: env.LINKEDIN_CLIENT_SECRET,
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
    scopes: ["threads_basic"],
    disableImplicitSignUp: true,
    disableSignUp: true,
    // Threads expects scopes to be comma-separated instead of space-separated.
    authorizationUrlParams: {
      scope: "threads_basic",
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
