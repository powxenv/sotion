import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  AiMagicIcon,
  ArrowLeft01Icon,
  ArrowUpRight01Icon,
  CheckmarkBadge03Icon,
  ConnectIcon,
  Flag02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Field, FieldError, FieldGroup } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Spinner } from "#/components/ui/spinner";
import { AI_PROVIDERS } from "#/lib/ai-providers";
import {
  listAiProviderSettingsOptions,
  saveAiProviderApiKey,
} from "#/services/ai-provider-settings/funcs";
import { getSessionOptions } from "#/services/auth/funcs";
import { getNotionMcpStatusOptions } from "#/services/notion-mcp/funcs";
import {
  completeOnboarding,
  getOnboardingStateOptions,
  setOnboardingStep,
} from "#/services/onboarding/funcs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/onboard/")({
  beforeLoad: async ({ context }) => {
    const session =
      await context.queryClient.ensureQueryData(getSessionOptions());

    if (!session) {
      throw redirect({ to: "/" });
    }

    const onboarding = await context.queryClient.ensureQueryData(
      getOnboardingStateOptions(),
    );

    if (onboarding.completedAt) {
      throw redirect({ to: "/app" });
    }

    await Promise.all([
      context.queryClient.ensureQueryData(getNotionMcpStatusOptions()),
      context.queryClient.ensureQueryData(listAiProviderSettingsOptions()),
    ]);
  },
  component: OnboardPage,
});

function OnboardPage() {
  const queryClient = useQueryClient();
  const { data: onboarding } = useSuspenseQuery(getOnboardingStateOptions());
  const { data: mcpStatus } = useSuspenseQuery(getNotionMcpStatusOptions());
  const { data: aiProviderSettings } = useSuspenseQuery(
    listAiProviderSettingsOptions(),
  );
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<
    "back-to-connect" | "back-to-provider" | "continue-to-finish" | "complete" | null
  >(null);

  const completeSetup = () => {
    startTransition(async () => {
      setPendingAction("complete");

      try {
        await completeOnboarding();
        window.location.assign("/app");
      } finally {
        setPendingAction(null);
      }
    });
  };

  const navigateToStep = (
    step: "connect_workspace" | "setup_ai_provider" | "finish",
    action: "back-to-connect" | "back-to-provider" | "continue-to-finish",
  ) => {
    startTransition(async () => {
      setPendingAction(action);

      try {
        await setOnboardingStep({
          data: { step },
        });
        await queryClient.invalidateQueries({
          queryKey: ["onboarding-state"],
        });
      } finally {
        setPendingAction(null);
      }
    });
  };

  const isConnectStep = onboarding.currentStep === "connect_workspace";
  const isAiProviderStep = onboarding.currentStep === "setup_ai_provider";
  const isFinishStep = onboarding.currentStep === "finish";
  const hasSavedProvider = aiProviderSettings.length > 0;
  const savedProviders = new Set(aiProviderSettings);
  const isConnectComplete = isAiProviderStep || isFinishStep;
  const isAiProviderComplete = isFinishStep;

  return (
    <main className="min-h-lvh flex items-center py-10">
      <div className="inner">
        <div className="flex items-center text-xl font-bold gap-1 mb-8">
          <img className="size-10" src="/logo.png" alt="Sotion Logo" />
          Sotion
        </div>
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div className="bg-muted p-8 rounded-xl">
            <div className="flex flex-col gap-6">
              <h1 className="text-2xl font-bold">Set up your workspace</h1>
              <div className="flex flex-col gap-8">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "size-14 shrink-0 rounded-full bg-background text-background-foreground flex justify-center items-center relative",
                      isConnectStep && "border border-dashed border-zinc-500",
                      isConnectComplete && "bg-primary text-primary-foreground",
                    )}
                  >
                    {isConnectComplete ? (
                      <HugeiconsIcon
                        icon={CheckmarkBadge03Icon}
                        strokeWidth={2}
                      />
                    ) : (
                      <HugeiconsIcon icon={ConnectIcon} strokeWidth={2} />
                    )}
                    <div className="absolute left-1/2 -translate-x-1/2 border-zinc-500 border-r border-dashed h-13 bottom-0 translate-y-full"></div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      Connect to Your Workspace
                    </h3>
                    <p>
                      Lorem ipsum dolor sit amet consectetur adipisicing elit.
                      Sequi odit.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "size-14 shrink-0 rounded-full bg-background text-background-foreground flex justify-center items-center relative",
                      isAiProviderStep &&
                        "border border-dashed border-zinc-500",
                      isAiProviderComplete &&
                        "bg-primary text-primary-foreground",
                    )}
                  >
                    {isAiProviderComplete ? (
                      <HugeiconsIcon
                        icon={CheckmarkBadge03Icon}
                        strokeWidth={2}
                      />
                    ) : (
                      <HugeiconsIcon icon={AiMagicIcon} strokeWidth={2} />
                    )}
                    <div className="absolute left-1/2 -translate-x-1/2 border-zinc-500 border-r border-dashed h-13 bottom-0 translate-y-full"></div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Add AI Providers</h3>
                    <p>
                      Lorem ipsum dolor sit amet consectetur adipisicing elit.
                      Sequi odit.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "size-14 shrink-0 rounded-full bg-background text-background-foreground flex justify-center items-center",
                      isFinishStep && "border border-dashed border-zinc-500",
                    )}
                  >
                    <HugeiconsIcon icon={Flag02Icon} strokeWidth={2} />
                  </div>
                  <h3 className="text-lg font-semibold">Finish!</h3>
                </div>
              </div>
            </div>
          </div>
          <div>
            {isConnectStep ? (
              <div className="mx-auto max-w-2xl flex flex-col gap-4">
                <div className="space-y-4">
                  <div className="flex flex-col gap-4">
                    <span className="font-medium text-muted-foreground">
                      Step 1 of 3
                    </span>
                    <h2 className="text-4xl font-bold">Connect Notion MCP</h2>
                    <div className="text-muted-foreground space-y-3">
                      <p>
                        Sotion helps you manage your social media workflow, from
                        shaping ideas into content to getting posts ready to
                        publish.
                      </p>
                      <p>
                        If your ideas, drafts, and content notes already live in
                        Notion, connecting your workspace gives Sotion the
                        context it needs to work from the same source as you.
                      </p>
                      <p>
                        After that, you can simply chat with Sotion. It can help
                        you pull from your Notion pages, turn rough notes into
                        posts, and move faster without copying things around
                        manually.
                      </p>
                      <p>
                        <a
                          href="https://www.notion.com/help/notion-mcp"
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          Learn more about Notion MCP
                        </a>
                        .
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      nativeButton={false}
                      render={
                        <a href="/api/integrations/notion/connect?returnTo=/onboard" />
                      }
                    >
                      {mcpStatus.hasConnectedBefore
                        ? "Reconnect Workspace"
                        : "Connect Workspace"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {isAiProviderStep ? (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  <span className="font-medium text-muted-foreground">
                    Step 2 of 3
                  </span>
                  <h2 className="text-4xl font-bold">Set up AI provider</h2>
                  <div className="text-muted-foreground space-y-3">
                    <p>Your Notion workspace is connected.</p>
                    <p>
                      Add at least one AI provider API key so Sotion can write,
                      refine, and manage your content through chat.
                    </p>
                    <p>
                      Your API keys are stored securely and encrypted end to
                      end.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <Accordion className="space-y-4">
                    {AI_PROVIDERS.map((provider) => {
                      const isSaved = savedProviders.has(provider.id);

                      return (
                        <AiProviderForm
                          key={provider.id}
                          provider={provider}
                          isSaved={isSaved}
                          onSaved={async () => {
                            await queryClient.invalidateQueries({
                              queryKey: ["ai-provider-settings"],
                            });
                          }}
                        />
                      );
                    })}
                  </Accordion>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigateToStep("connect_workspace", "back-to-connect")
                      }
                      disabled={isPending}
                    >
                      {pendingAction === "back-to-connect" ? (
                        <Spinner />
                      ) : (
                        <HugeiconsIcon
                          icon={ArrowLeft01Icon}
                          strokeWidth={2}
                        />
                      )}
                      Back
                    </Button>
                    <Button
                      onClick={() =>
                        navigateToStep("finish", "continue-to-finish")
                      }
                      disabled={isPending || !hasSavedProvider}
                    >
                      Continue
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      {hasSavedProvider
                        ? "At least one provider is ready."
                        : "Save at least one API key to continue."}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {isFinishStep ? (
              <div className="mx-auto max-w-2xl flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  <span className="font-medium text-muted-foreground">
                    Step 3 of 3
                  </span>
                  <h2 className="text-4xl font-bold">Finish setup</h2>
                  <div className="text-muted-foreground space-y-3">
                    <p>Your workspace is connected and at least one AI provider is ready.</p>
                    <p>
                      You can go back if you want to reconnect Notion or add more
                      API keys before entering the app.
                    </p>
                    <p>
                      When you continue, onboarding will be marked complete and
                      you will land in your workspace.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/40 p-5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">Notion workspace</span>
                    <Badge variant="outline">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">AI provider</span>
                    <Badge variant="outline">
                      {aiProviderSettings.length} saved
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() =>
                      navigateToStep("setup_ai_provider", "back-to-provider")
                    }
                    disabled={isPending}
                  >
                    {pendingAction === "back-to-provider" ? (
                      <Spinner />
                    ) : (
                      <HugeiconsIcon
                        icon={ArrowLeft01Icon}
                        strokeWidth={2}
                      />
                    )}
                    Back
                  </Button>
                  <Button onClick={completeSetup} disabled={isPending}>
                    Continue to App
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

const aiProviderFormSchema = z.object({
  apiKey: z.string().min(1, "API key is required."),
});

type AiProviderFormValues = z.infer<typeof aiProviderFormSchema>;

function AiProviderForm({
  provider,
  isSaved,
  onSaved,
}: {
  provider: (typeof AI_PROVIDERS)[number];
  isSaved: boolean;
  onSaved: () => Promise<void>;
}) {
  const form = useForm<AiProviderFormValues>({
    resolver: zodResolver(aiProviderFormSchema),
    defaultValues: {
      apiKey: "",
    },
  });

  const inputId = `provider-${provider.id}-api-key`;

  const onSubmit = async (values: AiProviderFormValues) => {
    try {
      await saveAiProviderApiKey({
        data: {
          provider: provider.id,
          apiKey: values.apiKey,
        },
      });
      form.reset();
      await onSaved();
    } catch (error) {
      form.setError("apiKey", {
        message:
          error instanceof Error ? error.message : "Failed to save API key.",
      });
    }
  };

  return (
    <AccordionItem>
      <AccordionTrigger className="hover:no-underline gap-2 cursor-pointer">
        {provider.label} API key
        <a
          href={provider.keyUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm underline text-muted-foreground inline-flex items-center gap-1"
        >
          Get API key
          <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-3.5" />
        </a>
        {isSaved ? <Badge variant="outline">Saved</Badge> : null}
      </AccordionTrigger>
      <AccordionContent>
        <form className="p-1" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="apiKey"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      {...field}
                      id={inputId}
                      type="password"
                      aria-invalid={fieldState.invalid}
                      placeholder={`Enter ${provider.label} API key`}
                    />
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting ? <Spinner /> : null}
                      Save
                    </Button>
                  </div>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
      </AccordionContent>
    </AccordionItem>
  );
}
