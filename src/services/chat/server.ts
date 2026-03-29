import "@tanstack/react-start/server-only";
import { and, desc, eq } from "drizzle-orm";
import { generateId, type LanguageModel, validateUIMessages } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createMoonshotAI } from "@ai-sdk/moonshotai";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createZhipu } from "zhipu-ai-provider";
import { db } from "#/db";
import { chat } from "#/db/schema";
import { env } from "#/env";
import {
  findChatModelOption,
  getDefaultChatModelSelection,
} from "#/lib/chat-models";
import { decrypt } from "#/lib/crypto";
import {
  findAiProviderSetting,
  listAiProviderSettingRows,
} from "#/services/ai-provider-settings/server";
import type { ChatMessage } from "#/services/chat/agent";

const AI_PROVIDER_ENCRYPTION_KEY = env.AI_PROVIDER_ENCRYPTION_KEY;
const ZHIPU_CHINA_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";
const ZHIPU_INTERNATIONAL_BASE_URL = "https://api.z.ai/api/paas/v4";

export async function saveChat(args: {
  userId: string;
  chatId: string;
  messages: ChatMessage[];
}) {
  const [updated] = await db
    .update(chat)
    .set({
      messages: JSON.stringify(args.messages),
      updatedAt: new Date(),
    })
    .where(and(eq(chat.id, args.chatId), eq(chat.userId, args.userId)))
    .returning({ id: chat.id });

  if (!updated) {
    throw new Response("Chat not found", { status: 404 });
  }
}

export async function clearChat(args: {
  userId: string;
  chatId: string;
}) {
  const [updated] = await db
    .update(chat)
    .set({
      messages: "[]",
      updatedAt: new Date(),
    })
    .where(and(eq(chat.id, args.chatId), eq(chat.userId, args.userId)))
    .returning({ id: chat.id, messages: chat.messages });

  if (!updated) {
    throw new Response("Chat not found", { status: 404 });
  }

  return {
    id: updated.id,
    messagesJson: updated.messages,
  };
}

export async function resolveChatLanguageModel(args: {
  userId: string;
  selectedModel?: string | null;
}): Promise<LanguageModel> {
  const resolvedSelectedModel =
    args.selectedModel ||
    getDefaultChatModelSelection(
      (await listAiProviderSettingRows(args.userId)).map(
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

  const setting = await findAiProviderSetting(
    args.userId,
    modelOption.providerId,
  );
  const apiKey = setting?.encryptedApiKey
    ? decrypt(setting.encryptedApiKey, AI_PROVIDER_ENCRYPTION_KEY)
    : null;

  if (!apiKey?.trim()) {
    throw Response.json(
      { error: "ai_provider_not_configured" },
      { status: 403 },
    );
  }

  const trimmedApiKey = apiKey.trim();

  switch (modelOption.providerId) {
    case "openrouter":
      return createOpenRouter({ apiKey: trimmedApiKey }).chat(
        modelOption.modelId,
      );
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

export async function getCurrentChatForUser(userId: string) {
  const [existing] = await db
    .select({
      id: chat.id,
      messages: chat.messages,
    })
    .from(chat)
    .where(eq(chat.userId, userId))
    .orderBy(desc(chat.updatedAt))
    .limit(1);

  if (existing) {
    try {
      await validateUIMessages<ChatMessage>({
        messages: JSON.parse(existing.messages),
      });

      return {
        id: existing.id,
        messagesJson: existing.messages,
      };
    } catch {
      return {
        id: existing.id,
        messagesJson: "[]",
      };
    }
  }

  const id = generateId();
  await db.insert(chat).values({
    id,
    userId,
    messages: "[]",
  });

  return {
    id,
    messagesJson: "[]",
  };
}
