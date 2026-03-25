export const AI_PROVIDERS = [
  {
    id: "openrouter",
    label: "OpenRouter",
    keyUrl: "https://openrouter.ai/settings/keys",
  },
  {
    id: "openai",
    label: "OpenAI",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "claude",
    label: "Claude",
    keyUrl: "https://platform.claude.com/settings/keys",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    keyUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "moonshot_ai",
    label: "Moonshot AI",
    keyUrl: "https://platform.moonshot.ai/console/api-keys",
  },
  {
    id: "zhipu_ai_china",
    label: "Zhipu AI (Z.AI) China",
    keyUrl: "https://bigmodel.cn/usercenter/proj-mgmt/apikeys",
  },
  {
    id: "zhipu_ai_international",
    label: "Zhipu AI (Z.AI) International",
    keyUrl: "https://z.ai/manage-apikey/apikey-list",
  },
] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number]["id"];

export function isAiProvider(value: string): value is AiProvider {
  return AI_PROVIDERS.some((provider) => provider.id === value);
}
