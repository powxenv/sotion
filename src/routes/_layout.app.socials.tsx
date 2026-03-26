import { formatDistanceToNow } from "date-fns";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useTransition } from "react";
import { z } from "zod";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
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

function getProviderTone(providerId: SocialConnectionProviderId) {
  switch (providerId) {
    case "twitter":
      return "bg-foreground text-background";
    case "linkedin":
      return "bg-sky-600 text-white";
    case "threads":
      return "bg-muted text-foreground";
  }
}

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

function SocialConnectionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const { data: connections } = useSuspenseQuery(listSocialConnectionsOptions());
  const [isConnecting, startConnect] = useTransition();
  const [connectingProviderId, setConnectingProviderId] =
    useState<SocialConnectionProviderId | null>(null);
  const [isDisconnecting, startDisconnect] = useTransition();
  const [disconnectingProviderId, setDisconnectingProviderId] =
    useState<SocialConnectionProviderId | null>(null);
  const [localNotice, setLocalNotice] = useState<{
    title: string;
    description: string;
    variant: "default" | "destructive";
  } | null>(null);

  const searchNotice = useMemo(() => {
    if (
      !search.status ||
      !search.provider ||
      !isSocialConnectionProviderId(search.provider)
    ) {
      return null;
    }

    const provider = getSocialConnectionProvider(search.provider);

    if (search.status === "linked") {
      return {
        title: `${provider.label} connected`,
        description: `The ${provider.label} account is now linked to your current Sotion account.`,
        variant: "default" as const,
      };
    }

    if (
      search.error &&
      search.error.includes("account_already_linked_to_different_user")
    ) {
      return {
        title: `Could not connect ${provider.label}`,
        description:
          "That social account is already linked to another user in this project.",
        variant: "destructive" as const,
      };
    }

    return {
      title: `Could not connect ${provider.label}`,
      description:
        "The provider did not complete the linking flow. Try again after checking the provider consent screen and callback URL settings.",
      variant: "destructive" as const,
    };
  }, [search.error, search.provider, search.status]);

  const createRedirectUrl = (
    providerId: SocialConnectionProviderId,
    status: "linked" | "error",
    error?: string,
  ) => {
    const url = new URL("/app/socials", window.location.origin);
    url.searchParams.set("provider", providerId);
    url.searchParams.set("status", status);

    if (error) {
      url.searchParams.set("error", error);
    }

    return url.toString();
  };

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

          {searchNotice ? (
            <Alert variant={searchNotice.variant}>
              <div>
                <AlertTitle>{searchNotice.title}</AlertTitle>
                <AlertDescription>{searchNotice.description}</AlertDescription>
              </div>
              <AlertAction>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    navigate({
                      to: "/app/socials",
                      search: {},
                      replace: true,
                    })
                  }
                >
                  Dismiss
                </Button>
              </AlertAction>
            </Alert>
          ) : null}

          {localNotice ? (
            <Alert variant={localNotice.variant}>
              <div>
                <AlertTitle>{localNotice.title}</AlertTitle>
                <AlertDescription>{localNotice.description}</AlertDescription>
              </div>
            </Alert>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-3">
            {connections.map((connection) => {
              const provider = getSocialConnectionProvider(connection.providerId);
              const connectedName =
                connection.displayName ||
                connection.handle ||
                connection.accountId ||
                null;
              const linkedAtLabel = connection.connectedAt
                ? formatDistanceToNow(new Date(connection.connectedAt), {
                    addSuffix: true,
                  })
                : null;

              return (
                <section key={provider.id} className="space-y-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <Avatar className="size-10 border">
                      <AvatarImage
                        src={connection.imageUrl ?? ""}
                        alt={provider.label}
                      />
                      <AvatarFallback
                        className={getProviderTone(provider.id)}
                      >
                        {provider.initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="space-y-1">
                        <h2 className="text-lg font-semibold">
                          {provider.label}
                        </h2>
                      </div>

                      {connection.isConnected ? (
                        <div className="space-y-1 text-sm">
                          <p className="font-medium">
                            {connectedName ?? "Connected account"}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                            {connection.handle &&
                            connection.handle !== connectedName ? (
                              <span>{connection.handle}</span>
                            ) : null}
                            {linkedAtLabel ? (
                              <span>Linked {linkedAtLabel}</span>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No account connected.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    {connection.isConnected ? (
                      <Button
                        variant="outline"
                        disabled={
                          (isConnecting &&
                            connectingProviderId === provider.id) ||
                          isDisconnecting &&
                          disconnectingProviderId === provider.id
                        }
                        onClick={() => {
                          setLocalNotice(null);
                          setDisconnectingProviderId(provider.id);

                          startDisconnect(async () => {
                            try {
                              await authClient.unlinkAccount({
                                providerId: provider.id,
                                accountId: connection.accountId ?? undefined,
                              });

                              await queryClient.invalidateQueries({
                                queryKey: ["social-connections"],
                              });

                              setLocalNotice({
                                title: `${provider.label} disconnected`,
                                description: `The linked ${provider.label} account has been removed from your Sotion account.`,
                                variant: "default",
                              });
                            } catch {
                              setLocalNotice({
                                title: `Could not disconnect ${provider.label}`,
                                description:
                                  "The linked account could not be removed. Try again.",
                                variant: "destructive",
                              });
                            } finally {
                              setDisconnectingProviderId(null);
                            }
                          });
                        }}
                      >
                        {isDisconnecting &&
                        disconnectingProviderId === provider.id ? (
                          <Spinner />
                        ) : null}
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        disabled={
                          isConnecting &&
                          connectingProviderId === provider.id
                        }
                        onClick={() => {
                          setLocalNotice(null);
                          setConnectingProviderId(provider.id);

                          startConnect(async () => {
                            try {
                              const callbackURL = createRedirectUrl(
                                provider.id,
                                "linked",
                              );
                              const errorCallbackURL = createRedirectUrl(
                                provider.id,
                                "error",
                              );

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
                              setConnectingProviderId(null);
                              setLocalNotice({
                                title: `Could not connect ${provider.label}`,
                                description:
                                  error instanceof Error
                                    ? error.message
                                    : "The provider could not start the linking flow.",
                                variant: "destructive",
                              });
                            }
                          });
                        }}
                      >
                        {isConnecting &&
                        connectingProviderId === provider.id ? (
                          <Spinner />
                        ) : null}
                        Connect
                      </Button>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
