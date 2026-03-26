import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createMoonshotAI } from "@ai-sdk/moonshotai";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createZhipu } from "zhipu-ai-provider";
import {
  findChatModelOption,
  getDefaultChatModelSelection,
} from "#/lib/chat-models";
import {
  getAiProviderApiKeyForRequest,
  listAiProviderSettingsForRequest,
} from "#/services/ai-provider-settings/service";

const ZHIPU_CHINA_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";
const ZHIPU_INTERNATIONAL_BASE_URL = "https://api.z.ai/api/paas/v4";

export async function resolveChatLanguageModelForRequest(
  request: Request,
  selectedModel?: string | null,
): Promise<LanguageModel> {
  const resolvedSelectedModel =
    selectedModel ||
    getDefaultChatModelSelection(
      (await listAiProviderSettingsForRequest(request)).map(
        (setting) => setting.provider,
      ),
    );

  if (!resolvedSelectedModel) {
    throw Response.json({ error: "ai_provider_required" }, { status: 403 });
  }

  const modelOption = findChatModelOption(resolvedSelectedModel);

  if (!modelOption) {
    throw Response.json({ error: "invalid_chat_model" }, { status: 400 });
  }

  const apiKey = await getAiProviderApiKeyForRequest({
    request,
    provider: modelOption.providerId,
  });

  if (!apiKey?.trim()) {
    throw Response.json(
      { error: "ai_provider_not_configured" },
      { status: 403 },
    );
  }

  const trimmedApiKey = apiKey.trim();

  switch (modelOption.providerId) {
    case "openrouter":
      return createOpenRouter({ apiKey: trimmedApiKey }).chat(modelOption.modelId);
    case "openai":
      return createOpenAI({ apiKey: trimmedApiKey })(modelOption.modelId);
    case "claude":
      return createAnthropic({ apiKey: trimmedApiKey })(modelOption.modelId);
    case "deepseek":
      return createDeepSeek({ apiKey: trimmedApiKey })(modelOption.modelId);
    case "moonshot_ai":
      return createMoonshotAI({ apiKey: trimmedApiKey })(modelOption.modelId);
    case "zhipu_ai_china":
      return createZhipu({
        apiKey: trimmedApiKey,
        baseURL: ZHIPU_CHINA_BASE_URL,
      })(modelOption.modelId);
    case "zhipu_ai_international":
      return createZhipu({
        apiKey: trimmedApiKey,
        baseURL: ZHIPU_INTERNATIONAL_BASE_URL,
      })(modelOption.modelId);
  }
}
