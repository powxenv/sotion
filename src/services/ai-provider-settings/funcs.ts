import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
  listAiProviderSettingsForRequest,
  saveAiProviderApiKeyForRequest,
} from "#/services/ai-provider-settings/service";
import { getServerRequest } from "#/services/shared/request";

export const listAiProviderSettings = createServerFn({ method: "GET" }).handler(
  async () => listAiProviderSettingsForRequest(getServerRequest()),
);

export const saveAiProviderApiKey = createServerFn({ method: "POST" })
  .inputValidator((data: { provider: string; apiKey: string }) => data)
  .handler(async ({ data }) => {
    return saveAiProviderApiKeyForRequest({
      request: getServerRequest(),
      ...data,
    });
  });

export const listAiProviderSettingsOptions = () =>
  queryOptions({
    queryKey: ["ai-provider-settings"],
    queryFn: listAiProviderSettings,
  });
