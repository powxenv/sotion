import { useState } from "react";
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
  FieldDescription,
  FieldError,
  FieldGroup,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Spinner } from "#/components/ui/spinner";
import { AI_PROVIDERS } from "#/lib/ai-providers";
import {
  listAiProviderSettingsOptions,
  saveAiProviderApiKey,
} from "#/services/ai-provider-settings/funcs";
import { getSessionOptions } from "#/services/auth/funcs";
import { getOnboardingStateOptions } from "#/services/onboarding/funcs";

const aiProviderFormSchema = z.object({
  apiKey: z.string().min(1, "API key is required."),
});

type AiProviderFormValues = z.infer<typeof aiProviderFormSchema>;

export const Route = createFileRoute("/_layout/app/providers")({
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

    await context.queryClient.ensureQueryData(listAiProviderSettingsOptions());
  },
  component: ProvidersPage,
});

function ProvidersPage() {
  const queryClient = useQueryClient();
  const { data: aiProviderSettings } = useSuspenseQuery(
    listAiProviderSettingsOptions(),
  );
  const savedProviders = new Set(aiProviderSettings);

  return (
    <main className="py-24">
      <div className="inner">
        <div className="flex flex-col gap-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold">AI Providers</h1>
            <p className="max-w-2xl text-muted-foreground">
              Manage the API keys Sotion uses for chat. Save a new key any time
              to replace the one currently stored for that provider.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {AI_PROVIDERS.map((provider) => (
              <ProviderCardForm
                key={provider.id}
                provider={provider}
                isSaved={savedProviders.has(provider.id)}
                onSaved={async () => {
                  await queryClient.invalidateQueries({
                    queryKey: ["ai-provider-settings"],
                  });
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function ProviderCardForm({
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const inputId = `providers-page-${provider.id}-api-key`;

  const onSubmit = async (values: AiProviderFormValues) => {
    const nextSuccessMessage = isSaved
      ? "API key updated. The previous saved key was replaced."
      : "API key saved.";

    try {
      await saveAiProviderApiKey({
        data: {
          provider: provider.id,
          apiKey: values.apiKey,
        },
      });
      form.reset();
      setSuccessMessage(nextSuccessMessage);
      await onSaved();
    } catch (error) {
      setSuccessMessage(null);
      form.setError("apiKey", {
        message:
          error instanceof Error ? error.message : "Failed to save API key.",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{provider.label}</h2>
        </div>
        <div className="flex items-center gap-1">
          {isSaved ? <Badge variant="outline">Saved</Badge> : null}
          <Button
            nativeButton={false}
            variant="ghost"
            size="sm"
            render={
              <a href={provider.keyUrl} target="_blank" rel="noreferrer" />
            }
          >
            Get API key
            <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-4" />
          </Button>
        </div>
      </div>

      <div>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldDescription>
                {isSaved
                  ? "A key is already saved for this provider. Saving again will override the existing key."
                  : "Paste the API key below to enable this provider."}
              </FieldDescription>
            </Field>

            <Controller
              name="apiKey"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex flex-col gap-2">
                    <Input
                      {...field}
                      id={inputId}
                      type="password"
                      aria-invalid={fieldState.invalid}
                      placeholder={`Enter ${provider.label} API key`}
                    />
                    <div className="flex items-center gap-3">
                      <Button
                        type="submit"
                        disabled={form.formState.isSubmitting}
                      >
                        {form.formState.isSubmitting ? <Spinner /> : null}
                        {isSaved ? "Save New Key" : "Save Key"}
                      </Button>
                      {successMessage ? (
                        <p className="text-sm text-muted-foreground">
                          {successMessage}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
      </div>
    </div>
  );
}
