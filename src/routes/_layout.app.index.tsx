import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import { useChat } from "@ai-sdk/react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon, AiBrain01Icon, CleanIcon } from "@hugeicons/core-free-icons";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import AiProviderDialog from "#/components/ai-provider-dialog";
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
import { listAiProviderSettingsOptions } from "#/services/ai-provider-settings/funcs";
import type { ChatMessage } from "#/services/chat/agent";
import { clearCurrentChat, getCurrentChatOptions } from "#/services/chat/funcs";
import { getNotionMcpStatusOptions } from "#/services/notion-mcp/funcs";
import { getOnboardingStateOptions } from "#/services/onboarding/funcs";
import { getSessionOptions } from "#/services/auth/funcs";
import {
  CHAT_MODEL_GROUPS,
  type ChatModelOption,
  findChatModelOption,
  getDefaultChatModelSelection,
} from "#/lib/chat-models";
import { ScrollArea } from "#/components/ui/scroll-area";

const chatTransport = new DefaultChatTransport({
  api: "/api/chat",
});
const CHAT_MODEL_STORAGE_KEY = "chat:selected-model";

const suggestedPrompts = [
  "Help me connect my X account",
  "Connect my LinkedIn account",
  "Show my connected social accounts",
  "Create a simple posting plan for this week",
  "Give me post ideas based on my notes",
  "Write a LinkedIn post from my draft",
  "Turn my notes into an X post",
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
      context.queryClient.ensureQueryData(getCurrentChatOptions()),
    ]);
  },
  component: App,
});

function App() {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [isClearingChat, startClearingChatTransition] = useTransition();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { data: mcpStatus } = useSuspenseQuery(getNotionMcpStatusOptions());
  const { data: aiProviderSettings } = useSuspenseQuery(
    listAiProviderSettingsOptions(),
  );
  const { data: currentChat } = useSuspenseQuery(getCurrentChatOptions());
  const hasConfiguredProvider = aiProviderSettings.length > 0;
  const configuredProviders = useMemo(
    () => new Set(aiProviderSettings),
    [aiProviderSettings],
  );
  const defaultSelectedModel = useMemo(
    () => getDefaultChatModelSelection(configuredProviders),
    [configuredProviders],
  );
  const [hasLoadedStoredModel, setHasLoadedStoredModel] = useState(false);
  const [selectedModelOverride, setSelectedModelOverride] = useState<
    string | null
  >(null);
  const selectedModel = useMemo(() => {
    if (selectedModelOverride) {
      const modelOption = findChatModelOption(selectedModelOverride);

      if (modelOption && configuredProviders.has(modelOption.providerId)) {
        return modelOption.value;
      }
    }

    return defaultSelectedModel;
  }, [configuredProviders, defaultSelectedModel, selectedModelOverride]);
  const selectedModelOption = useMemo<ChatModelOption | null>(
    () => (selectedModel ? findChatModelOption(selectedModel) : null),
    [selectedModel],
  );

  const initialMessages = useMemo<ChatMessage[]>(() => {
    try {
      return JSON.parse(currentChat.messagesJson);
    } catch {
      return [];
    }
  }, [currentChat.messagesJson]);

  const {
    messages,
    sendMessage,
    setMessages,
    stop,
    status,
    error,
    addToolApprovalResponse,
  } = useChat<ChatMessage>({
    id: currentChat.id,
    messages: initialMessages,
    transport: chatTransport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
  const shouldShowMcpDialog =
    !mcpStatus.connected && mcpStatus.hasConnectedBefore;
  const shouldShowAiProviderDialog = !hasConfiguredProvider;
  const isChatDisabled =
    !mcpStatus.connected ||
    !hasConfiguredProvider ||
    !selectedModel ||
    status !== "ready";
  const chatPlaceholder = !mcpStatus.connected
    ? "Reconnect Notion to continue"
    : !hasConfiguredProvider
      ? "Add an AI provider to start chatting"
      : !selectedModel
        ? "Choose an AI model to continue"
        : status !== "ready"
          ? "Sotion is working..."
          : "Ask Sotion to help with your content";

  useEffect(() => {
    const storedModel = window.localStorage.getItem(CHAT_MODEL_STORAGE_KEY);

    if (storedModel && findChatModelOption(storedModel)) {
      setSelectedModelOverride(storedModel);
    } else if (storedModel) {
      window.localStorage.removeItem(CHAT_MODEL_STORAGE_KEY);
    }

    setHasLoadedStoredModel(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredModel) {
      return;
    }

    if (!selectedModelOverride) {
      window.localStorage.removeItem(CHAT_MODEL_STORAGE_KEY);
      return;
    }

    if (!findChatModelOption(selectedModelOverride)) {
      window.localStorage.removeItem(CHAT_MODEL_STORAGE_KEY);
      setSelectedModelOverride(null);
      return;
    }

    window.localStorage.setItem(CHAT_MODEL_STORAGE_KEY, selectedModelOverride);
  }, [hasLoadedStoredModel, selectedModelOverride]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const viewport = scrollAreaRef.current?.querySelector<HTMLDivElement>(
        '[data-slot="scroll-area-viewport"]',
      );

      if (!viewport) {
        return;
      }

      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: "auto",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [messages, status]);

  const submitMessage = useCallback(
    async (text: string) => {
      const value = text.trim();

      if (
        !value ||
        !mcpStatus.connected ||
        !selectedModel ||
        status !== "ready"
      ) {
        return;
      }

      setInput("");
      await sendMessage(
        { text: value },
        {
          body: {
            selectedModel,
          },
        },
      );
    },
    [mcpStatus.connected, selectedModel, sendMessage, status],
  );

  const handleToolApprovalResponse = useCallback(
    async (approvalId: string, approved: boolean) => {
      await addToolApprovalResponse({
        id: approvalId,
        approved,
      });
    },
    [addToolApprovalResponse],
  );

  const handleClearChat = useCallback(() => {
    if (isClearingChat) {
      return;
    }

    startClearingChatTransition(async () => {
      stop();

      const clearedChat = await clearCurrentChat({
        data: {
          chatId: currentChat.id,
        },
      });

      setMessages([]);
      setInput("");
      queryClient.setQueryData(getCurrentChatOptions().queryKey, clearedChat);
    });
  }, [
    currentChat.id,
    isClearingChat,
    queryClient,
    setMessages,
    startClearingChatTransition,
    stop,
  ]);

  return (
    <>
      {shouldShowAiProviderDialog ? (
        <AiProviderDialog hasConfiguredProvider={hasConfiguredProvider} />
      ) : null}
      {!shouldShowAiProviderDialog && shouldShowMcpDialog ? (
        <McpDialog status={mcpStatus} />
      ) : null}

      <main className="h-lvh pt-10 relative">
        <ScrollArea ref={scrollAreaRef} className="h-full overflow-y-auto">
          <div className="inner py-8 h-full">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center flex-col">
                <img
                  className="h-60 dark:invert"
                  src="/notioly/Summer-Collection n.4.svg"
                  alt=""
                />
                <h1 className="text-3xl font-bold mb-2">
                  What would you like to work on?
                </h1>
                <p className="text-muted-foreground max-w-sm text-center">
                  Ask Sotion to plan posts, rewrite drafts, or help you connect
                  your accounts.
                </p>
                <div className="flex flex-wrap gap-1 mt-6 max-w-2xl justify-center">
                  {suggestedPrompts.map((prompt) => (
                    <Button
                      key={prompt}
                      className="justify-start text-muted-foreground"
                      variant="secondary"
                      size="lg"
                      disabled={isChatDisabled}
                      onClick={() => setInput(prompt)}
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
                onToolApprovalResponse={handleToolApprovalResponse}
              />
            )}
          </div>
        </ScrollArea>

        <div className="p-4 transition-all focus-within:border-primary border bg-background rounded-md flex flex-col gap-2 max-w-3xl mx-auto absolute sm:bottom-6 bottom-0 left-1/2 -translate-x-1/2 w-full shadow-lg shadow-black/4">
          <textarea
            value={input}
            disabled={isChatDisabled}
            placeholder={chatPlaceholder}
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
              "flex field-sizing-content min-h-9 w-full outline-none resize-none max-h-60",
            )}
          />

          <div className="flex items-center justify-between gap-1">
            <div className="flex gap-1">
              <Combobox<ChatModelOption>
                items={CHAT_MODEL_GROUPS}
                disabled={!mcpStatus.connected || !hasConfiguredProvider}
                value={selectedModelOption}
                itemToStringLabel={(item) => item.label}
                itemToStringValue={(item) => item.value}
                onValueChange={(value) =>
                  setSelectedModelOverride(value?.value ?? null)
                }
              >
                <ComboboxInput
                  disabled={!mcpStatus.connected || !hasConfiguredProvider}
                  placeholder="Choose an AI model"
                >
                  <InputGroupAddon>
                    <HugeiconsIcon icon={AiBrain01Icon} />
                  </InputGroupAddon>
                </ComboboxInput>
                <ComboboxContent>
                  <ComboboxEmpty>No models available.</ComboboxEmpty>
                  <ComboboxList>
                    {(group, index) => (
                      <ComboboxGroup key={group.value} items={group.items}>
                        <ComboboxLabel className="flex items-center justify-between gap-2">
                          <span>{group.value}</span>
                          {!configuredProviders.has(
                            group.items[0].providerId,
                          ) ? (
                            <span className="text-xs text-muted-foreground">
                              Not added
                            </span>
                          ) : null}
                        </ComboboxLabel>
                        <ComboboxCollection>
                          {(item) => (
                            <ComboboxItem
                              key={item.value}
                              value={item}
                              disabled={
                                !configuredProviders.has(item.providerId)
                              }
                            >
                              {item.label}
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                        {index < CHAT_MODEL_GROUPS.length - 1 && (
                          <ComboboxSeparator />
                        )}
                      </ComboboxGroup>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
            <div className="flex gap-1">
              {messages.length > 0 && (
                <Button
                  variant="destructive"
                  disabled={isClearingChat}
                  onClick={() => void handleClearChat()}
                >
                  {isClearingChat ? (
                    <Spinner />
                  ) : (
                    <HugeiconsIcon icon={CleanIcon} />
                  )}{" "}
                  New chat
                </Button>
              )}
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
        </div>
      </main>
    </>
  );
}
