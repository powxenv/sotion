import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "#/lib/auth";
import {
  DEFAULT_MCP_SERVER_PRESETS,
  isMcpServerPresetId,
} from "#/lib/mcp-providers";
import {
  listDefaultMcpServerConfigsForUser,
  saveDefaultMcpServerConfigForUser,
} from "#/services/mcp-settings/server";

export type McpSettingView = (typeof DEFAULT_MCP_SERVER_PRESETS)[number] & {
  enabled: boolean;
  hasSecret: boolean;
  selectedFeatureIds: string[];
};

export const listMcpSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new Response("Unauthorized", { status: 401 });
    }

    const settings = await listDefaultMcpServerConfigsForUser(session.user.id);

    return DEFAULT_MCP_SERVER_PRESETS.map((preset) => {
      const setting = settings.find(
        (candidate) => candidate.identifier === preset.id,
      );

      return {
        ...preset,
        enabled: setting?.enabled ?? false,
        hasSecret: setting?.hasSecret ?? false,
        selectedFeatureIds: setting?.selectedFeatureIds ?? [],
      };
    });
  },
);

export const saveMcpSetting = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      apiKey?: string;
      enabled: boolean;
      identifier: string;
      selectedFeatureIds?: string[];
    }) => data,
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new Response("Unauthorized", { status: 401 });
    }

    if (!isMcpServerPresetId(data.identifier)) {
      throw new Error(`Unsupported MCP preset: ${data.identifier}`);
    }

    await saveDefaultMcpServerConfigForUser({
      apiKey: data.apiKey,
      enabled: data.enabled,
      identifier: data.identifier,
      selectedFeatureIds: data.selectedFeatureIds,
      userId: session.user.id,
    });
  });

export const listMcpSettingsOptions = () =>
  queryOptions({
    queryKey: ["mcp-settings"],
    queryFn: listMcpSettings,
  });
