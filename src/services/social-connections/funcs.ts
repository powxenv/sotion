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
  status: "not_connected" | "connected" | "reauthorization_required";
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
        if (!row) {
          return {
            providerId: provider.id,
            status: "not_connected",
            accountId: null,
            connectedAt: null,
            scopes: [],
            displayName: null,
            handle: null,
            imageUrl: null,
          } satisfies SocialConnectionItem;
        }

        let status: SocialConnectionItem["status"] = "connected";
        let accessToken = row.accessToken;
        let accessTokenExpiresAt = row.accessTokenExpiresAt;

        try {
          const token = await auth.api.getAccessToken({
            headers,
            body: {
              providerId: provider.id,
              accountId: row.accountId,
              userId: session.user.id,
            },
          });

          accessToken = token?.accessToken ?? accessToken;
          accessTokenExpiresAt =
            token?.accessTokenExpiresAt ?? accessTokenExpiresAt;
        } catch {
          status = "reauthorization_required";
        }

        if (
          status === "connected" &&
          accessTokenExpiresAt &&
          new Date(accessTokenExpiresAt).getTime() <= Date.now()
        ) {
          status = "reauthorization_required";
        }

        const profile =
          status === "reauthorization_required"
            ? null
            : await getSocialConnectionProfile({
                accessToken,
                accountId: row.accountId,
                providerId: provider.id,
              });

        return {
          providerId: provider.id,
          status,
          accountId: row?.accountId ?? null,
          connectedAt: row?.createdAt.toISOString() ?? null,
          scopes: row?.scope
            ? row.scope
                .split(/[,\s]+/)
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
