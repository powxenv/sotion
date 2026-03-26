export const CHAT_MODEL_GROUPS = [
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

export function findChatModelOption(value: string) {
  for (const group of CHAT_MODEL_GROUPS) {
    for (const item of group.items) {
      if (item.value === value) {
        return item;
      }
    }
  }

  return null;
}

export function getDefaultChatModelSelection(configuredProviders: Iterable<string>) {
  const availableProviders = new Set(configuredProviders);

  for (const group of CHAT_MODEL_GROUPS) {
    for (const item of group.items) {
      if (availableProviders.has(item.providerId)) {
        return item.value;
      }
    }
  }

  return null;
}
