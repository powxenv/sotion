import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "#/lib/auth";
import {
  SOCIAL_CONNECTION_PROVIDERS,
  isSocialConnectionProviderId,
  type SocialConnectionProviderId,
} from "#/lib/social-connections";
import {
  getSocialConnectionProfile,
  listSocialConnectionRows,
} from "#/services/social-connections/server";

type SocialConnectionItem = {
  providerId: SocialConnectionProviderId;
  isConnected: boolean;
  accountId: string | null;
  connectedAt: string | null;
  scopes: string[];
  displayName: string | null;
  handle: string | null;
  imageUrl: string | null;
};

export const listSocialConnections = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new Response("Unauthorized", { status: 401 });
    }

    const rows = await listSocialConnectionRows(session.user.id);
    const latestByProvider = new Map<
      SocialConnectionProviderId,
      (typeof rows)[number]
    >();

    for (const row of rows) {
      if (!isSocialConnectionProviderId(row.providerId)) {
        continue;
      }

      if (!latestByProvider.has(row.providerId)) {
        latestByProvider.set(row.providerId, row);
      }
    }

    const items = await Promise.all(
      SOCIAL_CONNECTION_PROVIDERS.map(async (provider) => {
        const row = latestByProvider.get(provider.id);
        const profile = row
          ? await getSocialConnectionProfile({
              accessToken: row.accessToken,
              accountId: row.accountId,
              providerId: provider.id,
            })
          : null;

        return {
          providerId: provider.id,
          isConnected: Boolean(row),
          accountId: row?.accountId ?? null,
          connectedAt: row?.createdAt.toISOString() ?? null,
          scopes: row?.scope
            ? row.scope
                .split(",")
                .map((scope) => scope.trim())
                .filter(Boolean)
            : [],
          displayName: profile?.displayName ?? null,
          handle: profile?.handle ?? null,
          imageUrl: profile?.imageUrl ?? null,
        } satisfies SocialConnectionItem;
      }),
    );

    return items;
  },
);

export const unlinkSocialConnection = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { providerId: string; accountId?: string | null }) => data,
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new Response("Unauthorized", { status: 401 });
    }

    if (!isSocialConnectionProviderId(data.providerId)) {
      throw new Error(`Unsupported social provider: ${data.providerId}`);
    }

    await auth.api.unlinkAccount({
      headers,
      body: {
        providerId: data.providerId,
        accountId: data.accountId ?? undefined,
      },
    });
  });

export const listSocialConnectionsOptions = () =>
  queryOptions({
    queryKey: ["social-connections"],
    queryFn: listSocialConnections,
  });
