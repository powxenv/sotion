import { formatDistanceToNow } from "date-fns";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Badge } from "#/components/ui/badge";
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
  error_description: z.string().optional(),
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
  status: "not_connected" | "connected" | "reauthorization_required";
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
  error_description?: string;
}): SocialConnectionsSearchFeedback | null {
  if (
    search.status !== "error" ||
    !search.provider ||
    !isSocialConnectionProviderId(search.provider)
  ) {
    return null;
  }

  const provider = getSocialConnectionProvider(search.provider);
  const title = `Could not connect ${provider.label}`;
  const errorCode = search.error?.trim().toLowerCase() ?? null;
  const errorDescription = search.error_description?.trim();
  let description: string;

  switch (errorCode) {
    case "email_doesn't_match":
    case "email_doesnt_match":
    case "email_mismatch":
      description = "That account uses a different email address.";
      break;
    case "account_already_linked_to_different_user":
    case "social_account_already_linked":
    case "linked_account_already_exists":
      description = "That account is already connected to another user.";
      break;
    case "unable_to_link_account":
      description =
        "We couldn't connect that account right now. Please try again.";
      break;
    case "email_not_found":
    case "email_is_missing":
    case "user_email_not_found":
      description = "We couldn't get an email address from that account.";
      break;
    case "unable_to_get_user_info":
    case "user_info_is_missing":
    case "failed_to_get_user_info":
      description =
        "We couldn't read that account right now. Please try again.";
      break;
    case "invalid_code":
    case "oauth_code_verification_failed":
    case "no_code":
      description = "This connection link expired. Please try again.";
      break;
    case "oauth_provider_not_found":
    case "provider_not_found":
      description = "This connection isn't available right now.";
      break;
    case "no_callback_url":
    case "invalid_callback_url":
    case "invalid_error_callback_url":
      description =
        "There is a problem with the connection setup. Please try again later.";
      break;
    case "access_denied":
      description = "The connection was canceled before it finished.";
      break;
    default:
      description =
        errorDescription && errorDescription.length > 0
          ? errorDescription
          : errorCode
            ? "We couldn't connect that account. Please try again."
            : "We couldn't connect that account. Please try again.";
  }

  return {
    providerId: search.provider,
    notice: {
      title,
      description,
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
  const isConnected = props.connection.status !== "not_connected";
  const needsReauthorization =
    props.connection.status === "reauthorization_required";

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
  const isUnavailable = provider.availability === "disabled";

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
            : "We couldn't start the connection. Please try again.",
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
        description: "We couldn't remove that connection. Please try again.",
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
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{provider.label}</h2>
            {needsReauthorization ? (
              <Badge variant="destructive">Reconnect needed</Badge>
            ) : null}
            {isUnavailable ? (
              <Badge variant="outline">
                {provider.availabilityLabel ?? "Unavailable"}
              </Badge>
            ) : null}
          </div>

          {isConnected ? (
            <div className="space-y-1 text-sm">
              <p className="font-medium">
                {connectedName ??
                  (needsReauthorization
                    ? "Linked account needs to be reconnected"
                    : "Connected account")}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                {props.connection.handle &&
                props.connection.handle !== connectedName ? (
                  <span>{props.connection.handle}</span>
                ) : null}
                {linkedAtLabel ? <span>Linked {linkedAtLabel}</span> : null}
              </div>
              {needsReauthorization ? (
                <p className="text-destructive">
                  Reconnect this account before using it for publishing.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No account connected yet.
            </p>
          )}

          <p className="text-sm text-muted-foreground">{provider.summary}</p>

          {feedback ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <p className="font-medium">{feedback.title}</p>
              <p>{feedback.description}</p>
            </div>
          ) : null}

          {isUnavailable ? null : (
            <div>
              {isConnected && !needsReauthorization ? (
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={disconnectAccount}
                >
                  {pendingAction === "disconnecting" ? <Spinner /> : null}
                  Remove connection
                </Button>
              ) : (
                <Button disabled={isPending} onClick={connectAccount}>
                  {pendingAction === "connecting" ? <Spinner /> : null}
                  {needsReauthorization
                    ? "Reconnect account"
                    : "Connect account"}
                </Button>
              )}
            </div>
          )}
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
    <main className="py-24">
      <div className="inner">
        <div className="flex flex-col gap-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold">Social accounts</h1>
            <p className="max-w-2xl text-muted-foreground">
              Connect the accounts you want Sotion to help manage or publish
              to. Each connection belongs to the signed-in user.
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
