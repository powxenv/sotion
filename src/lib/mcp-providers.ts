type McpFeatureDefinition = {
  id: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
  toolNames: string[];
};

export const DEFAULT_MCP_SERVER_PRESETS = [
  {
    id: "exa",
    label: "Exa",
    description: "Helps Sotion search the web and open useful pages for you.",
    source: "default",
    transportType: "http",
    serverUrl: "https://mcp.exa.ai/mcp",
    authType: "api_key",
    docsUrl: "https://exa.ai/docs/reference/exa-mcp",
    apiKeyUrl: "https://dashboard.exa.ai/api-keys",
    features: [
      {
        id: "search",
        label: "Search the web",
        description: "Find helpful pages and answers from across the web.",
        defaultEnabled: true,
        toolNames: ["web_search_exa"],
      },
      {
        id: "deep-search",
        label: "Search more deeply",
        description:
          "Run a broader search when a quick search is not enough.",
        defaultEnabled: false,
        toolNames: ["web_search_advanced_exa"],
      },
      {
        id: "open-pages",
        label: "Open pages",
        description: "Open and read a page after Sotion finds something useful.",
        defaultEnabled: true,
        toolNames: ["crawling_exa"],
      },
    ],
  },
  {
    id: "tavily",
    label: "Tavily",
    description:
      "Helps Sotion find fresh information online and read the pages it finds.",
    source: "default",
    transportType: "http",
    serverUrl: "https://mcp.tavily.com/mcp/",
    authType: "api_key",
    docsUrl: "https://docs.tavily.com/documentation/mcp",
    apiKeyUrl: "https://app.tavily.com/home",
    features: [
      {
        id: "search",
        label: "Search the web",
        description: "Look for up-to-date answers and pages on the web.",
        defaultEnabled: true,
        toolNames: ["tavily-search"],
      },
      {
        id: "open-pages",
        label: "Open pages",
        description: "Open and read a page after Sotion finds something useful.",
        defaultEnabled: true,
        toolNames: ["tavily-extract"],
      },
    ],
  },
] as const satisfies readonly {
  id: string;
  label: string;
  description: string;
  source: string;
  transportType: "http" | "sse";
  serverUrl: string;
  authType: string;
  docsUrl: string;
  apiKeyUrl: string;
  features: readonly McpFeatureDefinition[];
}[];

export type McpServerPresetId =
  (typeof DEFAULT_MCP_SERVER_PRESETS)[number]["id"];
export type McpServerPreset = (typeof DEFAULT_MCP_SERVER_PRESETS)[number];

export function isMcpServerPresetId(
  value: string,
): value is McpServerPresetId {
  return DEFAULT_MCP_SERVER_PRESETS.some((provider) => provider.id === value);
}

export function getMcpServerPreset(presetId: McpServerPresetId) {
  const preset = DEFAULT_MCP_SERVER_PRESETS.find(
    (candidate) => candidate.id === presetId,
  );

  if (!preset) {
    throw new Error(`Unsupported MCP preset: ${presetId}`);
  }

  return preset;
}

export function getDefaultFeatureIds(presetId: McpServerPresetId) {
  return getMcpServerPreset(presetId).features
    .filter((feature) => feature.defaultEnabled)
    .map((feature) => feature.id);
}

export function normalizeSelectedFeatureIds(
  presetId: McpServerPresetId,
  selectedFeatureIds?: string[] | null,
) {
  const preset = getMcpServerPreset(presetId);
  const allowedFeatureIds = new Set<string>(
    preset.features.map((feature) => feature.id),
  );
  const requestedFeatureIds =
    selectedFeatureIds && selectedFeatureIds.length > 0
      ? selectedFeatureIds
      : getDefaultFeatureIds(presetId);

  return requestedFeatureIds.filter((featureId) =>
    allowedFeatureIds.has(featureId),
  );
}

export function getToolNamesForSelectedFeatures(
  presetId: McpServerPresetId,
  selectedFeatureIds?: string[] | null,
) {
  const preset = getMcpServerPreset(presetId);
  const selectedFeatureIdSet = new Set(
    normalizeSelectedFeatureIds(presetId, selectedFeatureIds),
  );

  return preset.features.flatMap((feature) =>
    selectedFeatureIdSet.has(feature.id) ? feature.toolNames : [],
  );
}

export function resolveRemoteMcpServerUrl(args: {
  presetId: McpServerPresetId;
  apiKey: string;
  serverUrl: string;
  selectedFeatureIds?: string[] | null;
}) {
  switch (args.presetId) {
    case "exa": {
      const url = new URL(args.serverUrl);
      const toolNames = getToolNamesForSelectedFeatures(
        args.presetId,
        args.selectedFeatureIds,
      );

      url.searchParams.set("exaApiKey", args.apiKey);
      url.searchParams.set("tools", toolNames.join(","));
      return url.toString();
    }
    case "tavily": {
      const url = new URL(args.serverUrl);
      url.searchParams.set("tavilyApiKey", args.apiKey);
      return url.toString();
    }
  }
}

export function filterPresetTools<TTools extends Record<string, unknown>>(args: {
  presetId: McpServerPresetId;
  selectedFeatureIds?: string[] | null;
  tools: TTools;
}) {
  const allowedToolNames = new Set<string>(
    getToolNamesForSelectedFeatures(args.presetId, args.selectedFeatureIds),
  );

  return Object.fromEntries(
    Object.entries(args.tools).filter(([toolName]) =>
      allowedToolNames.has(toolName),
    ),
  ) as TTools;
}
