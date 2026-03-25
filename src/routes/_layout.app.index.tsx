import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon, AiBrain01Icon } from "@hugeicons/core-free-icons";
import { useCallback, useMemo, useState } from "react";
import ChatMessageList from "#/components/chat-message-list";
import McpDialog from "#/components/mcp-dialog";
import { Button } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";
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
import { getCurrentChatOptions } from "#/services/chat/funcs";
import { getNotionMcpStatusOptions } from "#/services/notion-mcp/funcs";
import { getOnboardingStateOptions } from "#/services/onboarding/funcs";
import { getSessionOptions } from "#/services/auth/funcs";
import type { AiProvider } from "#/lib/ai-providers";
import { ScrollArea } from "#/components/ui/scroll-area";

type ProviderModel = {
  providerId: AiProvider;
  value: string;
  modelId: string;
  label: string;
};

const providers = [
  {
    value: "OpenRouter",
    items: [
      {
        providerId: "openrouter",
        value: "openrouter:openai/gpt-5.4",
        modelId: "openai/gpt-5.4",
        label: "GPT-5.4",
      },
      {
        providerId: "openrouter",
        value: "openrouter:anthropic/claude-sonnet-4.6",
        modelId: "anthropic/claude-sonnet-4.6",
        label: "Claude Sonnet 4.6",
      },
      {
        providerId: "openrouter",
        value: "openrouter:deepseek/deepseek-v3.2",
        modelId: "deepseek/deepseek-v3.2",
        label: "DeepSeek V3.2",
      },
      {
        providerId: "openrouter",
        value: "openrouter:moonshotai/kimi-k2.5",
        modelId: "moonshotai/kimi-k2.5",
        label: "Kimi K2.5",
      },
    ],
  },
  {
    value: "OpenAI",
    items: [
      {
        providerId: "openai",
        value: "openai:gpt-5.4",
        modelId: "gpt-5.4",
        label: "GPT-5.4",
      },
      {
        providerId: "openai",
        value: "openai:gpt-5-mini",
        modelId: "gpt-5-mini",
        label: "GPT-5 Mini",
      },
      {
        providerId: "openai",
        value: "openai:gpt-5-nano",
        modelId: "gpt-5-nano",
        label: "GPT-5 Nano",
      },
      {
        providerId: "openai",
        value: "openai:gpt-5.3-chat-latest",
        modelId: "gpt-5.3-chat-latest",
        label: "GPT-5.3",
      },
    ],
  },
  {
    value: "Claude",
    items: [
      {
        providerId: "claude",
        value: "claude:claude-sonnet-4-6",
        modelId: "claude-sonnet-4-6",
        label: "Claude Sonnet 4.6",
      },
      {
        providerId: "claude",
        value: "claude:claude-opus-4-6",
        modelId: "claude-opus-4-6",
        label: "Claude Opus 4.6",
      },
    ],
  },
  {
    value: "DeepSeek",
    items: [
      {
        providerId: "deepseek",
        value: "deepseek:deepseek-chat",
        modelId: "deepseek-chat",
        label: "DeepSeek Chat",
      },
      {
        providerId: "deepseek",
        value: "deepseek:deepseek-reasoner",
        modelId: "deepseek-reasoner",
        label: "DeepSeek Reasoner",
      },
    ],
  },
  {
    value: "Moonshot AI",
    items: [
      {
        providerId: "moonshot_ai",
        value: "moonshot_ai:kimi-k2.5",
        modelId: "kimi-k2.5",
        label: "Kimi K2.5",
      },
      {
        providerId: "moonshot_ai",
        value: "moonshot_ai:kimi-k2-thinking-turbo",
        modelId: "kimi-k2-thinking-turbo",
        label: "Kimi K2 Thinking",
      },
    ],
  },
  {
    value: "Z.AI China",
    items: [
      {
        providerId: "zhipu_ai_china",
        value: "zhipu_ai_china:glm-5",
        modelId: "glm-5",
        label: "GLM-5",
      },
      {
        providerId: "zhipu_ai_china",
        value: "zhipu_ai_china:glm-4.7",
        modelId: "glm-4.7",
        label: "GLM-4.7",
      },
    ],
  },
  {
    value: "Z.AI International",
    items: [
      {
        providerId: "zhipu_ai_international",
        value: "zhipu_ai_international:glm-5",
        modelId: "glm-5",
        label: "GLM-5",
      },
      {
        providerId: "zhipu_ai_international",
        value: "zhipu_ai_international:glm-4.7",
        modelId: "glm-4.7",
        label: "GLM-4.7",
      },
    ],
  },
] as const;

const chatTransport = new DefaultChatTransport({
  api: "/api/chat",
});

const suggestedPrompts = [
  "Help me connect my X account",
  "Help me connect my LinkedIn",
  "Show me what I've posted",
  "Create a posting plan for me",
  "Give me content ideas",
  "Write a LinkedIn post for me",
  "Turn my content into an X post",
] as const;

function getDefaultSelectedModel(configuredProviders: Set<AiProvider>) {
  for (const group of providers) {
    for (const item of group.items) {
      if (configuredProviders.has(item.providerId)) {
        return item.value;
      }
    }
  }

  return null;
}

function parseChatMessages(messagesJson: string): UIMessage[] {
  try {
    const parsed = JSON.parse(messagesJson);
    return Array.isArray(parsed) ? (parsed as UIMessage[]) : [];
  } catch {
    return [];
  }
}

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
      context.queryClient.ensureQueryData(getCurrentChatOptions()),
    ]);
  },
  component: App,
});

function App() {
  const [input, setInput] = useState("");
  const { data: mcpStatus } = useSuspenseQuery(getNotionMcpStatusOptions());
  const { data: aiProviderSettings } = useSuspenseQuery(
    listAiProviderSettingsOptions(),
  );
  const { data: currentChat } = useSuspenseQuery(getCurrentChatOptions());
  const configuredProviders = useMemo(
    () => new Set(aiProviderSettings.map((setting) => setting.provider)),
    [aiProviderSettings],
  );
  const defaultSelectedModel = useMemo(
    () => getDefaultSelectedModel(configuredProviders),
    [configuredProviders],
  );
  const [selectedModelOverride, setSelectedModelOverride] = useState<
    string | null
  >(null);
  const initialMessages = useMemo(
    () => parseChatMessages(currentChat.messagesJson),
    [currentChat.id, currentChat.messagesJson],
  );
  const selectedModel = useMemo(() => {
    const selectedModelIsConfigured =
      selectedModelOverride &&
      providers.some((group) =>
        group.items.some(
          (item) =>
            item.value === selectedModelOverride &&
            configuredProviders.has(item.providerId),
        ),
      );

    return (selectedModelIsConfigured ? selectedModelOverride : null) || defaultSelectedModel;
  }, [configuredProviders, defaultSelectedModel, selectedModelOverride]);
  const { messages, sendMessage, status, error } = useChat({
    id: currentChat.id,
    messages: initialMessages,
    transport: chatTransport,
  });
  const isChatDisabled = !mcpStatus.connected || status !== "ready";

  const submitMessage = useCallback(
    async (text: string) => {
      const value = text.trim();

      if (!value || !mcpStatus.connected || status !== "ready") {
        return;
      }

      setInput("");
      await sendMessage({ text: value });
    },
    [mcpStatus.connected, sendMessage, status],
  );

  return (
    <>
      <McpDialog status={mcpStatus} />

      <main className="h-[calc(100lvh-57px)] relative">
        <ScrollArea className="h-full overflow-y-auto">
          <div className="inner py-8 h-full">
            {messages.length === 0 ? (
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
                {suggestedPrompts.map((prompt) => (
                  <Button
                    key={prompt}
                    className="justify-start text-muted-foreground"
                      variant="secondary"
                      size="lg"
                      disabled={!mcpStatus.connected || status !== "ready"}
                      onClick={() => submitMessage(prompt)}
                    >
                      <span>{prompt}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <ChatMessageList
                messages={messages}
                status={status}
                error={error}
              />
            )}
          </div>
        </ScrollArea>
        <div className="p-4 transition-all focus-within:border-primary border bg-background rounded-md flex flex-col gap-2 max-w-3xl mx-auto absolute bottom-6 left-1/2 -translate-x-1/2 w-full shadow-lg shadow-black/4">
          <textarea
            value={input}
            disabled={!mcpStatus.connected || status !== "ready"}
            placeholder="Type here..."
            onChange={(event) => setInput(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                void submitMessage(input);
              }
            }}
            className={cn(
              "flex field-sizing-content min-h-9 w-full outline-none resize-none max-h-60 text-muted-foreground",
            )}
          />

          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <Combobox
                items={providers}
                disabled={!mcpStatus.connected}
                value={selectedModel}
                onValueChange={setSelectedModelOverride}
              >
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
                          {!configuredProviders.has(
                            group.items[0].providerId,
                          ) ? (
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
                              disabled={
                                !configuredProviders.has(item.providerId)
                              }
                            >
                              {item.label}
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                        {index < providers.length - 1 && <ComboboxSeparator />}
                      </ComboboxGroup>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
            <Button
              disabled={isChatDisabled || input.trim().length === 0}
              onClick={() => void submitMessage(input)}
            >
              {status === "submitted" || status === "streaming" ? (
                <Spinner />
              ) : (
                <HugeiconsIcon icon={SentIcon} />
              )}
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
