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
import { getNotionMcpStatusOptions } from "#/services/notion-mcp/funcs";
import { getOnboardingStateOptions } from "#/services/onboarding/funcs";
import { getSessionOptions } from "#/services/auth/funcs";

const providers = [
  {
    value: "OpenRouter",
    items: [
      "anthropic/claude-sonnet-4-20250514",
      "anthropic/claude-opus-4-20250514",
      "anthropic/claude-3.5-sonnet",
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "google/gemini-2.5-pro-preview-03-25",
      "meta-llama/llama-3.3-70b-instruct",
      "deepseek/deepseek-chat",
    ],
  },
  {
    value: "OpenAI",
    items: [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-4",
      "gpt-3.5-turbo",
      "o1-preview",
      "o1-mini",
    ],
  },
  {
    value: "Claude",
    items: [
      "claude-sonnet-4-20250514",
      "claude-opus-4-20250514",
      "claude-3.5-sonnet",
      "claude-3.5-haiku",
      "claude-3-opus",
    ],
  },
  {
    value: "Z.AI",
    items: ["zai-7b", "zai-13b", "zai-34b", "zai-70b"],
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
  },
  component: App,
});

function App() {
  const { data: mcpStatus } = useSuspenseQuery(getNotionMcpStatusOptions());

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
                          <ComboboxLabel>{group.value}</ComboboxLabel>
                          <ComboboxCollection>
                            {(item) => (
                              <ComboboxItem key={item} value={item}>
                                {item}
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
