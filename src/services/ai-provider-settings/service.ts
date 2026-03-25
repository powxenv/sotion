import { randomUUID } from "node:crypto";
import { db } from "#/db";
import { aiProviderSetting } from "#/db/schema";
import { env } from "#/env";
import { isAiProvider, type AiProvider } from "#/lib/ai-providers";
import { decrypt, encrypt } from "#/lib/crypto";
import { requireSession } from "#/services/auth/session";
import {
  findAiProviderSetting,
  listAiProviderSettingRows,
} from "#/services/ai-provider-settings/query";

const AI_PROVIDER_ENCRYPTION_KEY = env.AI_PROVIDER_ENCRYPTION_KEY;

function assertSupportedProvider(provider: string): asserts provider is AiProvider {
  if (!isAiProvider(provider)) {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

export async function saveAiProviderApiKeyForRequest(args: {
  request: Request;
  provider: string;
  apiKey: string;
}) {
  const session = await requireSession(args.request);

  assertSupportedProvider(args.provider);

  const now = new Date();

  const [saved] = await db
    .insert(aiProviderSetting)
    .values({
      id: randomUUID(),
      userId: session.user.id,
      provider: args.provider,
      encryptedApiKey: encrypt(args.apiKey, AI_PROVIDER_ENCRYPTION_KEY) || "",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [aiProviderSetting.userId, aiProviderSetting.provider],
      set: {
        encryptedApiKey: encrypt(args.apiKey, AI_PROVIDER_ENCRYPTION_KEY) || "",
        updatedAt: now,
      },
    })
    .returning();

  return {
    id: saved.id,
    provider: saved.provider as AiProvider,
    hasApiKey: true,
    updatedAt: saved.updatedAt.toISOString(),
  };
}

export async function listAiProviderSettingsForRequest(request: Request) {
  const session = await requireSession(request);
  const settings = await listAiProviderSettingRows(session.user.id);

  return settings.map((setting) => ({
    id: setting.id,
    provider: setting.provider as AiProvider,
    hasApiKey: true,
    updatedAt: setting.updatedAt.toISOString(),
  }));
}

export async function getAiProviderApiKeyForRequest(args: {
  request: Request;
  provider: string;
}) {
  const session = await requireSession(args.request);

  assertSupportedProvider(args.provider);
  const setting = await findAiProviderSetting(session.user.id, args.provider);

  return setting
    ? decrypt(setting.encryptedApiKey, AI_PROVIDER_ENCRYPTION_KEY)
    : null;
}
