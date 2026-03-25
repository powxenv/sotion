import { createFileRoute, redirect } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon, AiBrain01Icon } from "@hugeicons/core-free-icons";
import McpDialog from "#/components/mcp-dialog";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
} from "@/components/ui/combobox";
import { InputGroupAddon } from "@/components/ui/input-group";
import { useSuspenseQuery } from "@tanstack/react-query";
import { listAiProviderSettingsOptions } from "#/services/ai-provider-settings/funcs";
import { getNotionMcpStatusOptions } from "#/services/notion-mcp/funcs";
import { getOnboardingStateOptions } from "#/services/onboarding/funcs";
import { getSessionOptions } from "#/services/auth/funcs";
import type { AiProvider } from "#/lib/ai-providers";

type ProviderModel = {
  providerId: AiProvider;
  value: string;
  label: string;
};

const providers = [
  {
    value: "OpenRouter",
    items: [
      {
        providerId: "openrouter",
        value: "openai/gpt-5.4",
        label: "GPT-5.4",
      },
      {
        providerId: "openrouter",
        value: "anthropic/claude-sonnet-4.6",
        label: "Claude Sonnet 4.6",
      },
      {
        providerId: "openrouter",
        value: "deepseek/deepseek-v3.2",
        label: "DeepSeek V3.2",
      },
      {
        providerId: "openrouter",
        value: "moonshotai/kimi-k2.5",
        label: "Kimi K2.5",
      },
    ],
  },
  {
    value: "OpenAI",
    items: [
      {
        providerId: "openai",
        value: "gpt-5.4",
        label: "GPT-5.4",
      },
      {
        providerId: "openai",
        value: "gpt-5-mini",
        label: "GPT-5 Mini",
      },
      {
        providerId: "openai",
        value: "gpt-5-nano",
        label: "GPT-5 Nano",
      },
      {
        providerId: "openai",
        value: "gpt-5.3-chat-latest",
        label: "GPT-5.3",
      },
    ],
  },
  {
    value: "Claude",
    items: [
      {
        providerId: "claude",
        value: "claude-sonnet-4-6",
        label: "Claude Sonnet 4.6",
      },
      {
        providerId: "claude",
        value: "claude-opus-4-6",
        label: "Claude Opus 4.6",
      },
    ],
  },
  {
    value: "DeepSeek",
    items: [
      {
        providerId: "deepseek",
        value: "deepseek-chat",
        label: "DeepSeek Chat",
      },
      {
        providerId: "deepseek",
        value: "deepseek-reasoner",
        label: "DeepSeek Reasoner",
      },
    ],
  },
  {
    value: "Moonshot AI",
    items: [
      {
        providerId: "moonshot_ai",
        value: "kimi-k2.5",
        label: "Kimi K2.5",
      },
      {
        providerId: "moonshot_ai",
        value: "kimi-k2-thinking-turbo",
        label: "Kimi K2 Thinking",
      },
    ],
  },
  {
    value: "Z.AI China",
    items: [
      {
        providerId: "zhipu_ai_china",
        value: "glm-5",
        label: "GLM-5",
      },
      {
        providerId: "zhipu_ai_china",
        value: "glm-4.7",
        label: "GLM-4.7",
      },
    ],
  },
  {
    value: "Z.AI International",
    items: [
      {
        providerId: "zhipu_ai_international",
        value: "glm-5",
        label: "GLM-5",
      },
      {
        providerId: "zhipu_ai_international",
        value: "glm-4.7",
        label: "GLM-4.7",
      },
    ],
  },
] as const;

export const Route = createFileRoute("/_layout/app/")({
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

    await Promise.all([
      context.queryClient.ensureQueryData(getNotionMcpStatusOptions()),
      context.queryClient.ensureQueryData(listAiProviderSettingsOptions()),
    ]);
  },
  component: App,
});

function App() {
  const { data: mcpStatus } = useSuspenseQuery(getNotionMcpStatusOptions());
  const { data: aiProviderSettings } = useSuspenseQuery(
    listAiProviderSettingsOptions(),
  );
  const configuredProviders = new Set(
    aiProviderSettings.map((setting) => setting.provider),
  );

  return (
    <>
      <main className="py-8 h-[calc(100lvh-57px)]">
        <div className="inner h-full overflow-y-auto relative">
          <McpDialog status={mcpStatus} />

          <div className="flex items-center justify-center flex-col">
            <img
              className="h-60 dark:invert"
              src="/notioly/Summer-Collection n.4.svg"
              alt=""
            />
            <h1 className="text-3xl font-bold mb-2">Welcome!</h1>
            <p className="text-muted-foreground max-w-sm text-center">
              Try typing below or click quick prompts to get started
            </p>
            <div className="flex flex-wrap gap-1 mt-6 max-w-2xl justify-center">
              <Button
                className="justify-start text-muted-foreground"
                variant="secondary"
                size="lg"
              >
                <span>Help Me Connect My X Account</span>
              </Button>
              <Button
                className="justify-start text-muted-foreground"
                variant="secondary"
                size="lg"
              >
                <span>Help Me Connect My LinkedIn</span>
              </Button>
              <Button
                className="justify-start text-muted-foreground"
                variant="secondary"
                size="lg"
              >
                <span>Show Me What I’ve Posted</span>
              </Button>
              <Button
                className="justify-start text-muted-foreground"
                variant="secondary"
                size="lg"
              >
                <span>Create a Posting Plan for Me</span>
              </Button>
              <Button
                className="justify-start text-muted-foreground"
                variant="secondary"
                size="lg"
              >
                <span>Give Me Content Ideas</span>
              </Button>
              <Button
                className="justify-start text-muted-foreground"
                variant="secondary"
                size="lg"
              >
                <span>Write a LinkedIn Post for Me</span>
              </Button>
              <Button
                className="justify-start text-muted-foreground"
                variant="secondary"
                size="lg"
              >
                <span>Turn My Content into an X Post</span>
              </Button>
            </div>
          </div>

          <div className="p-4 transition-all focus-within:border-primary border bg-background rounded-md flex flex-col gap-2 max-w-3xl mx-auto absolute bottom-6 left-1/2 -translate-x-1/2 w-full shadow-lg shadow-black/4">
            <textarea
              disabled={!mcpStatus.connected}
              placeholder="Type here..."
              className={cn(
                "flex field-sizing-content min-h-9 w-full outline-none resize-none max-h-60 text-muted-foreground",
              )}
            />

            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <Combobox items={providers} disabled={!mcpStatus.connected}>
                  <ComboboxInput
                    disabled={!mcpStatus.connected}
                    placeholder="Select a model"
                  >
                    <InputGroupAddon>
                      <HugeiconsIcon icon={AiBrain01Icon} />
                    </InputGroupAddon>
                  </ComboboxInput>
                  <ComboboxContent>
                    <ComboboxEmpty>No models found.</ComboboxEmpty>
                    <ComboboxList>
                      {(group, index) => (
                        <ComboboxGroup key={group.value} items={group.items}>
                          <ComboboxLabel className="flex items-center justify-between gap-2">
                            <span>{group.value}</span>
                            {!configuredProviders.has(group.items[0].providerId) ? (
                              <span className="text-xs text-muted-foreground">
                                Not set up
                              </span>
                            ) : null}
                          </ComboboxLabel>
                          <ComboboxCollection>
                            {(item: ProviderModel) => (
                              <ComboboxItem
                                key={item.value}
                                value={item.value}
                                disabled={!configuredProviders.has(item.providerId)}
                              >
                                {item.label}
                              </ComboboxItem>
                            )}
                          </ComboboxCollection>
                          {index < providers.length - 1 && (
                            <ComboboxSeparator />
                          )}
                        </ComboboxGroup>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
              <Button disabled={!mcpStatus.connected}>
                <HugeiconsIcon icon={SentIcon} />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
