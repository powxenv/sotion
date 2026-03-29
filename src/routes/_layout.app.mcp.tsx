import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowUpRight01Icon,
  Settings02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Spinner } from "#/components/ui/spinner";
import { Switch } from "#/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#/components/ui/tooltip";
import { getSessionOptions } from "#/services/auth/funcs";
import {
  type McpSettingView,
  listMcpSettingsOptions,
  saveMcpSetting,
} from "#/services/mcp-settings/funcs";
import { getOnboardingStateOptions } from "#/services/onboarding/funcs";

const configuredMcpSchema = z.object({
  apiKey: z.string(),
  features: z.record(z.string(), z.boolean()),
});

type ConfiguredMcpValues = z.infer<typeof configuredMcpSchema>;

export const Route = createFileRoute("/_layout/app/mcp")({
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

    await context.queryClient.ensureQueryData(listMcpSettingsOptions());
  },
  component: McpSettingsPage,
});

function McpSettingsPage() {
  const queryClient = useQueryClient();
  const { data: mcpSettings } = useSuspenseQuery(listMcpSettingsOptions());

  const refreshSettings = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["mcp-settings"],
    });
  };

  return (
    <main className="py-24">
      <div className="inner">
        <div className="flex flex-col gap-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold">Online sources</h1>
            <p className="max-w-3xl text-muted-foreground">
              Choose which web sources Sotion can use when it needs fresh
              information. You can turn each one on or off at any time and
              decide how Sotion should use each source.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            {mcpSettings.map((setting, index) => (
              <ConfiguredMcpRow
                key={setting.id}
                setting={setting}
                isFirst={index === 0}
                onSaved={refreshSettings}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function ConfiguredMcpRow({
  setting,
  isFirst,
  onSaved,
}: {
  setting: McpSettingView;
  isFirst: boolean;
  onSaved: () => Promise<void>;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSavingSwitch, setIsSavingSwitch] = useState(false);
  const form = useForm<ConfiguredMcpValues>({
    resolver: zodResolver(configuredMcpSchema),
    defaultValues: {
      apiKey: "",
      features: createFeatureState(setting),
    },
  });
  const switchId = `mcp-settings-${setting.id}-enabled`;
  const inputId = `mcp-settings-${setting.id}-api-key`;

  useEffect(() => {
    form.reset({
      apiKey: "",
      features: createFeatureState(setting),
    });
  }, [form, setting]);

  const updateEnabled = async (nextEnabled: boolean) => {
    if (nextEnabled && !setting.hasSecret) {
      setIsDialogOpen(true);
      return;
    }

    setIsSavingSwitch(true);

    try {
      await saveMcpSetting({
        data: {
          identifier: setting.id,
          enabled: nextEnabled,
          apiKey: "",
          selectedFeatureIds: setting.selectedFeatureIds,
        },
      });

      toast.success(
        nextEnabled ? `${setting.label} is now on.` : `${setting.label} is now off.`,
      );
      await onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "We couldn't update this source right now.",
      );
    } finally {
      setIsSavingSwitch(false);
    }
  };

  const saveConfig = async (values: ConfiguredMcpValues) => {
    const selectedFeatureIds = setting.features
      .filter((feature) => values.features[feature.id])
      .map((feature) => feature.id);

    try {
      await saveMcpSetting({
        data: {
          identifier: setting.id,
          enabled: setting.enabled,
          apiKey: values.apiKey,
          selectedFeatureIds,
        },
      });

      form.reset({
        apiKey: "",
        features: values.features,
      });
      setIsDialogOpen(false);
      toast.success("Changes saved.");
      await onSaved();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't save these changes right now.";

      if (message.toLowerCase().includes("choose at least one")) {
        form.setError("features", { message });
        return;
      }

      form.setError("apiKey", { message });
    }
  };

  return (
    <section className={isFirst ? "px-6 py-5" : "border-t px-6 py-5"}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-medium">{setting.label}</h2>
            {setting.hasSecret ? <Badge variant="outline">Key added</Badge> : null}
          </div>

          <p className="max-w-2xl text-sm text-muted-foreground">
            {setting.description}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger
              render={<Button variant="outline" size="icon-sm" />}
            >
              <HugeiconsIcon icon={Settings02Icon} className="size-4" />
              <span className="sr-only">Open {setting.label} settings</span>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>{setting.label} setup</DialogTitle>
                <DialogDescription>
                  Add your API key and choose how Sotion can use this source.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={form.handleSubmit(saveConfig)}>
                <FieldGroup className="gap-6">
                  <Controller
                    name="apiKey"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={inputId}>API key</FieldLabel>
                        <Input
                          {...field}
                          id={inputId}
                          type="password"
                          aria-invalid={fieldState.invalid}
                          placeholder={`Paste your ${setting.label} API key`}
                        />
                        {setting.hasSecret ? (
                          <FieldDescription>
                            Leave this blank if you want to keep the key you
                            already saved.
                          </FieldDescription>
                        ) : null}
                        {fieldState.invalid ? (
                          <FieldError errors={[fieldState.error]} />
                        ) : null}
                      </Field>
                    )}
                  />

                  <FieldGroup className="gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        How should Sotion use it?
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Choose the kinds of help you want from this source.
                      </p>
                    </div>

                    {setting.features.map((feature) => {
                      const checkboxId = `${setting.id}-feature-${feature.id}`;

                      return (
                        <Controller
                          key={feature.id}
                          name={`features.${feature.id}`}
                          control={form.control}
                          render={({ field }) => (
                            <Field orientation="horizontal">
                              <Checkbox
                                id={checkboxId}
                                checked={Boolean(field.value)}
                                onCheckedChange={field.onChange}
                              />
                              <FieldContent>
                                <FieldLabel
                                  htmlFor={checkboxId}
                                  className="cursor-pointer"
                                >
                                  {feature.label}
                                </FieldLabel>
                                <FieldDescription>
                                  {feature.description}
                                </FieldDescription>
                              </FieldContent>
                            </Field>
                          )}
                        />
                      );
                    })}

                    {typeof form.formState.errors.features?.message ===
                    "string" ? (
                      <FieldError>
                        {form.formState.errors.features.message}
                      </FieldError>
                    ) : null}
                  </FieldGroup>
                </FieldGroup>
              </form>

              <DialogFooter className="justify-between sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    nativeButton={false}
                    variant="ghost"
                    size="sm"
                    render={
                      <a href={setting.docsUrl} target="_blank" rel="noreferrer" />
                    }
                  >
                    Learn more
                    <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-4" />
                  </Button>

                  <Button
                    nativeButton={false}
                    variant="ghost"
                    size="sm"
                    render={
                      <a
                        href={setting.apiKeyUrl}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    Open key page
                    <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-4" />
                  </Button>
                </div>

                <Button
                  type="button"
                  onClick={form.handleSubmit(saveConfig)}
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? <Spinner /> : null}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Tooltip>
            <TooltipTrigger
              render={
                <div className="flex items-center">
                  <Switch
                    id={switchId}
                    checked={setting.enabled}
                    disabled={isSavingSwitch}
                    onCheckedChange={updateEnabled}
                  />
                </div>
              }
            />
            <TooltipContent>
              {setting.enabled ? "Turn off" : "Turn on"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </section>
  );
}

function createFeatureState(setting: McpSettingView) {
  return Object.fromEntries(
    setting.features.map((feature) => [
      feature.id,
      setting.selectedFeatureIds.includes(feature.id),
    ]),
  );
}
