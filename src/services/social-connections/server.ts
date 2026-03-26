import "@tanstack/react-start/server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "#/db";
import { account } from "#/db/schema";
import {
  SOCIAL_CONNECTION_PROVIDERS,
  type SocialConnectionProviderId,
} from "#/lib/social-connections";

type SocialConnectionProfile = {
  displayName: string | null;
  handle: string | null;
  imageUrl: string | null;
};

const SOCIAL_CONNECTION_PROVIDER_IDS = SOCIAL_CONNECTION_PROVIDERS.map(
  (provider) => provider.id,
);

export async function listSocialConnectionRows(userId: string) {
  return db
    .select({
      providerId: account.providerId,
      accountId: account.accountId,
      accessToken: account.accessToken,
      scope: account.scope,
      createdAt: account.createdAt,
    })
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        inArray(account.providerId, SOCIAL_CONNECTION_PROVIDER_IDS),
      ),
    )
    .orderBy(desc(account.createdAt));
}

export async function getSocialConnectionProfile(args: {
  accessToken: string | null;
  accountId: string;
  providerId: SocialConnectionProviderId;
}): Promise<SocialConnectionProfile | null> {
  if (!args.accessToken) {
    return null;
  }

  try {
    switch (args.providerId) {
      case "twitter": {
        const response = await fetch(
          "https://api.x.com/2/users/me?user.fields=profile_image_url,username,name",
          {
            headers: {
              Authorization: `Bearer ${args.accessToken}`,
            },
          },
        );

        if (!response.ok) {
          return null;
        }

        const profile = (await response.json()) as {
          data?: {
            name?: string;
            username?: string;
            profile_image_url?: string;
          };
        };

        return {
          displayName: profile.data?.name ?? null,
          handle: profile.data?.username ? `@${profile.data.username}` : null,
          imageUrl: profile.data?.profile_image_url ?? null,
        };
      }
      case "linkedin": {
        const response = await fetch("https://api.linkedin.com/v2/userinfo", {
          headers: {
            Authorization: `Bearer ${args.accessToken}`,
          },
        });

        if (!response.ok) {
          return null;
        }

        const profile = (await response.json()) as {
          name?: string;
          picture?: string;
        };

        return {
          displayName: profile.name ?? null,
          handle: null,
          imageUrl: profile.picture ?? null,
        };
      }
      case "threads": {
        const profileUrl = new URL("https://graph.threads.net/v1.0/me");
        profileUrl.searchParams.set(
          "fields",
          "id,username,name,threads_profile_picture_url",
        );
        profileUrl.searchParams.set("access_token", args.accessToken);

        const response = await fetch(profileUrl);

        if (!response.ok) {
          return null;
        }

        const profile = (await response.json()) as {
          name?: string;
          username?: string;
          threads_profile_picture_url?: string;
        };

        return {
          displayName: profile.name ?? null,
          handle: profile.username ? `@${profile.username}` : null,
          imageUrl: profile.threads_profile_picture_url ?? null,
        };
      }
    }
  } catch {
    return null;
  }
}
