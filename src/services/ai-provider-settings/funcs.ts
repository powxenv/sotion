import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "#/lib/auth";
import { isAiProvider, type AiProvider } from "#/lib/ai-providers";
import {
  listAiProviderSettingRows,
  saveAiProviderApiKeyForUser,
} from "#/services/ai-provider-settings/server";

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

    await saveAiProviderApiKeyForUser({
      apiKey: data.apiKey,
      provider: data.provider,
      userId: session.user.id,
    });
  });

export const listAiProviderSettingsOptions = () =>
  queryOptions({
    queryKey: ["ai-provider-settings"],
    queryFn: listAiProviderSettings,
  });
