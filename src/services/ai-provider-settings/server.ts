import "@tanstack/react-start/server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "#/db";
import { aiProviderSetting } from "#/db/schema";
import { env } from "#/env";
import { encrypt } from "#/lib/crypto";

const AI_PROVIDER_ENCRYPTION_KEY = env.AI_PROVIDER_ENCRYPTION_KEY;

export async function listAiProviderSettingRows(userId: string) {
  return db
    .select({
      provider: aiProviderSetting.provider,
    })
    .from(aiProviderSetting)
    .where(eq(aiProviderSetting.userId, userId))
    .orderBy(asc(aiProviderSetting.provider));
}

export async function findAiProviderSetting(userId: string, provider: string) {
  const [setting] = await db
    .select({
      encryptedApiKey: aiProviderSetting.encryptedApiKey,
    })
    .from(aiProviderSetting)
    .where(
      and(
        eq(aiProviderSetting.userId, userId),
        eq(aiProviderSetting.provider, provider),
      ),
    )
    .limit(1);

  return setting ?? null;
}

export async function saveAiProviderApiKeyForUser(args: {
  apiKey: string;
  provider: string;
  userId: string;
}) {
  const now = new Date();
  const encryptedApiKey =
    encrypt(args.apiKey, AI_PROVIDER_ENCRYPTION_KEY) || "";

  await db
    .insert(aiProviderSetting)
    .values({
      id: randomUUID(),
      userId: args.userId,
      provider: args.provider,
      encryptedApiKey,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [aiProviderSetting.userId, aiProviderSetting.provider],
      set: {
        encryptedApiKey,
        updatedAt: now,
      },
    });
}
