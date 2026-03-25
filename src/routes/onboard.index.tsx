import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Spinner } from "#/components/ui/spinner";
import {
  AI_PROVIDERS,
} from "#/lib/ai-providers";
import {
  listAiProviderSettingsOptions,
  saveAiProviderApiKey,
} from "#/services/ai-provider-settings/funcs";
import { getSessionOptions } from "#/services/auth/funcs";
import { getNotionMcpStatusOptions } from "#/services/notion-mcp/funcs";
import {
  completeOnboarding,
  getOnboardingStateOptions,
} from "#/services/onboarding/funcs";

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

  const completeSetup = () => {
    startTransition(async () => {
      await completeOnboarding();
      window.location.assign("/app");
    });
  };

  const isConnectStep = onboarding.currentStep === "connect_workspace";
  const isAiProviderStep = onboarding.currentStep === "setup_ai_provider";
  const hasSavedProvider = aiProviderSettings.length > 0;
  const savedProviders = new Set(
    aiProviderSettings.map((item) => item.provider),
  );

  return (
    <main className="min-h-lvh flex items-center py-10">
      <div className="inner">
        <div className="mx-auto flex flex-col gap-4">
          <div className="flex items-center text-xl font-bold gap-1">
            <img className="size-10" src="/logo.png" alt="Sotion Logo" />
            Sotion
            <Badge variant="outline">Onboarding</Badge>
          </div>

          {isConnectStep ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-4">
                <h1 className="text-4xl font-bold">
                  Step 1. Connect Notion MCP
                </h1>
                <div className="text-muted-foreground space-y-3">
                  <p>
                    Sotion helps you manage your social media workflow, from
                    shaping ideas into content to getting posts ready to
                    publish.
                  </p>
                  <p>
                    If your ideas, drafts, and content notes already live in
                    Notion, connecting your workspace gives Sotion the context
                    it needs to work from the same source as you.
                  </p>
                  <p>
                    After that, you can simply chat with Sotion. It can help you
                    pull from your Notion pages, turn rough notes into posts,
                    and move faster without copying things around manually.
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
          ) : null}

          {isAiProviderStep ? (
            <div className="grid grid-cols-2 gap-10">
              <div className="flex flex-col gap-4">
                <h1 className="text-4xl font-bold">
                  Step 2. Set up AI provider
                </h1>
                <div className="text-muted-foreground space-y-3">
                  <p>Your Notion workspace is connected.</p>
                  <p>
                    Add at least one AI provider API key so Sotion can write,
                    refine, and manage your content through chat.
                  </p>
                  <p>
                    Your API keys are stored securely and encrypted end to end.
                  </p>
                  <p>
                    You only need one provider to get started, and you can add
                    more later.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="space-y-4">
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
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={completeSetup}
                    disabled={isPending || !hasSavedProvider}
                  >
                    {isPending ? <Spinner /> : null}
                    Continue to App
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
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          name="apiKey"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={inputId}>
                {provider.label} API key
                <a
                  href={provider.keyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm underline text-muted-foreground inline-flex items-center gap-1"
                >
                  Get API key
                  <HugeiconsIcon
                    icon={ArrowUpRight01Icon}
                    className="size-3.5"
                  />
                </a>
                {isSaved ? <Badge variant="outline">Saved</Badge> : null}
              </FieldLabel>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  {...field}
                  id={inputId}
                  type="password"
                  aria-invalid={fieldState.invalid}
                  placeholder={`Enter ${provider.label} API key`}
                />
                <Button type="submit" disabled={form.formState.isSubmitting}>
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
  );
}
