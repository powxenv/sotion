import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { db } from "#/db";
import { aiProviderSetting } from "#/db/schema";
import { env } from "#/env";
import { auth } from "#/lib/auth";
import { isAiProvider, type AiProvider } from "#/lib/ai-providers";
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

export const listAiProviderSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new Response("Unauthorized", { status: 401 });
    }

    const settings = await listAiProviderSettingRows(session.user.id);

    return settings.map((setting) => setting.provider as AiProvider);
  },
);

export const saveAiProviderApiKey = createServerFn({ method: "POST" })
  .inputValidator((data: { provider: string; apiKey: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new Response("Unauthorized", { status: 401 });
    }

    if (!isAiProvider(data.provider)) {
      throw new Error(`Unsupported AI provider: ${data.provider}`);
    }

    const now = new Date();
    const encryptedApiKey = encrypt(data.apiKey, AI_PROVIDER_ENCRYPTION_KEY) || "";
    await db
      .insert(aiProviderSetting)
      .values({
        id: randomUUID(),
        userId: session.user.id,
        provider: data.provider,
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
  });

export const listAiProviderSettingsOptions = () =>
  queryOptions({
    queryKey: ["ai-provider-settings"],
    queryFn: listAiProviderSettings,
  });
