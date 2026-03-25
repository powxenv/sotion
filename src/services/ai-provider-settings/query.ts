import { and, eq } from "drizzle-orm";
import { db } from "#/db";
import { aiProviderSetting } from "#/db/schema";

export async function listAiProviderSettingRows(userId: string) {
  return db
    .select({
      id: aiProviderSetting.id,
      provider: aiProviderSetting.provider,
      updatedAt: aiProviderSetting.updatedAt,
    })
    .from(aiProviderSetting)
    .where(eq(aiProviderSetting.userId, userId));
}

export async function findAiProviderSetting(userId: string, provider: string) {
  const [setting] = await db
    .select()
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
