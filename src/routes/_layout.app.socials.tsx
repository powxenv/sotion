import { formatDistanceToNow } from "date-fns";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";
import { authClient } from "#/lib/auth-client";
import {
  getSocialConnectionProvider,
  isSocialConnectionProviderId,
  type SocialConnectionProviderId,
} from "#/lib/social-connections";
import { getSessionOptions } from "#/services/auth/funcs";
import { getOnboardingStateOptions } from "#/services/onboarding/funcs";
import { listSocialConnectionsOptions } from "#/services/social-connections/funcs";

const socialConnectionsSearchSchema = z.object({
  provider: z.string().optional(),
  status: z.enum(["linked", "error"]).optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute("/_layout/app/socials")({
  validateSearch: (search) => socialConnectionsSearchSchema.parse(search),
  beforeLoad: async ({ context }) => {
    const session =
      await context.queryClient.ensureQueryData(getSessionOptions());

    if (!session) {
      throw redirect({ to: "/" });
    }

    const onboarding = await context.queryClient.ensureQueryData(
      getOnboardingStateOptions(),
    );

    if (!onboarding.completedAt) {
      throw redirect({ to: "/onboard" });
    }

    await context.queryClient.ensureQueryData(listSocialConnectionsOptions());
  },
  component: SocialConnectionsPage,
});

type SocialConnectionsNotice = {
  title: string;
  description: string;
};

type SocialConnectionsSearchFeedback = {
  providerId: SocialConnectionProviderId;
  notice: SocialConnectionsNotice;
};

type PendingAction = "idle" | "connecting" | "disconnecting";

type SocialConnectionViewModel = {
  providerId: SocialConnectionProviderId;
  isConnected: boolean;
  accountId: string | null;
  connectedAt: string | null;
  scopes: string[];
  displayName: string | null;
  handle: string | null;
  imageUrl: string | null;
};

function createRedirectUrl(
  providerId: SocialConnectionProviderId,
  status: "linked" | "error",
  error?: string,
) {
  const url = new URL("/app/socials", window.location.origin);
  url.searchParams.set("provider", providerId);
  url.searchParams.set("status", status);

  if (error) {
    url.searchParams.set("error", error);
  }

  return url.toString();
}

function getSearchFeedback(search: {
  provider?: string;
  status?: "linked" | "error";
  error?: string;
}): SocialConnectionsSearchFeedback | null {
  if (
    search.status !== "error" ||
    !search.provider ||
    !isSocialConnectionProviderId(search.provider)
  ) {
    return null;
  }

  const provider = getSocialConnectionProvider(search.provider);

  if (
    search.error &&
    search.error.includes("account_already_linked_to_different_user")
  ) {
    return {
      providerId: search.provider,
      notice: {
        title: `Could not connect ${provider.label}`,
        description:
          "That social account is already linked to another user in this project.",
      },
    };
  }

  return {
    providerId: search.provider,
    notice: {
      title: `Could not connect ${provider.label}`,
      description:
        "The provider did not complete the linking flow. Try again after checking the provider consent screen and callback URL settings.",
    },
  };
}

function SocialConnectionCard(props: {
  connection: SocialConnectionViewModel;
  initialFeedback?: SocialConnectionsNotice | null;
}) {
  const queryClient = useQueryClient();
  const provider = getSocialConnectionProvider(props.connection.providerId);
  const [pendingAction, setPendingAction] = useState<PendingAction>("idle");
  const [feedback, setFeedback] = useState<SocialConnectionsNotice | null>(
    props.initialFeedback ?? null,
  );

  const connectedName =
    props.connection.displayName ||
    props.connection.handle ||
    props.connection.accountId ||
    null;
  const linkedAtLabel = props.connection.connectedAt
    ? formatDistanceToNow(new Date(props.connection.connectedAt), {
        addSuffix: true,
      })
    : null;
  const isPending = pendingAction !== "idle";

  const connectAccount = async () => {
    setFeedback(null);
    setPendingAction("connecting");

    try {
      const callbackURL = createRedirectUrl(provider.id, "linked");
      const errorCallbackURL = createRedirectUrl(provider.id, "error");

      if (provider.providerType === "oauth2") {
        await authClient.oauth2.link({
          providerId: provider.id,
          callbackURL,
          errorCallbackURL,
        });
      } else {
        await authClient.linkSocial({
          provider: provider.id,
          callbackURL,
          errorCallbackURL,
        });
      }
    } catch (error) {
      setFeedback({
        title: `Could not connect ${provider.label}`,
        description:
          error instanceof Error
            ? error.message
            : "The provider could not start the linking flow.",
      });
      setPendingAction("idle");
    }
  };

  const disconnectAccount = async () => {
    setFeedback(null);
    setPendingAction("disconnecting");

    try {
      await authClient.unlinkAccount({
        providerId: provider.id,
        accountId: props.connection.accountId ?? undefined,
      });

      await queryClient.invalidateQueries({
        queryKey: ["social-connections"],
      });
    } catch {
      setFeedback({
        title: `Could not disconnect ${provider.label}`,
        description: "The linked account could not be removed. Try again.",
      });
    } finally {
      setPendingAction("idle");
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-background p-2">
          <img
            src={provider.logoPath}
            alt={provider.label}
            className="size-full object-contain"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-lg font-semibold">{provider.label}</h2>

          {props.connection.isConnected ? (
            <div className="space-y-1 text-sm">
              <p className="font-medium">{connectedName ?? "Connected account"}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                {props.connection.handle &&
                props.connection.handle !== connectedName ? (
                  <span>{props.connection.handle}</span>
                ) : null}
                {linkedAtLabel ? <span>Linked {linkedAtLabel}</span> : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No account connected.
            </p>
          )}

          {feedback ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <p className="font-medium">{feedback.title}</p>
              <p>{feedback.description}</p>
            </div>
          ) : null}

          <div>
            {props.connection.isConnected ? (
              <Button
                variant="outline"
                disabled={isPending}
                onClick={disconnectAccount}
              >
                {pendingAction === "disconnecting" ? <Spinner /> : null}
                Disconnect
              </Button>
            ) : (
              <Button
                disabled={isPending}
                onClick={connectAccount}
              >
                {pendingAction === "connecting" ? <Spinner /> : null}
                Connect
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SocialConnectionsPage() {
  const search = Route.useSearch();
  const { data: connections } = useSuspenseQuery(
    listSocialConnectionsOptions(),
  );
  const searchFeedback = getSearchFeedback(search);

  return (
    <main className="py-10">
      <div className="inner">
        <div className="flex flex-col gap-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold">Social Connections</h1>
            <p className="max-w-2xl text-muted-foreground">
              Connect the text-based social accounts you want to manage from
              this Sotion workspace. Each connection is attached to the user who
              is currently signed in.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {connections.map((connection) => {
              return (
                <SocialConnectionCard
                  key={connection.providerId}
                  connection={connection}
                  initialFeedback={
                    searchFeedback?.providerId === connection.providerId
                      ? searchFeedback.notice
                      : null
                  }
                />
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
