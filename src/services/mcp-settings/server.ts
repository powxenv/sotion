import "@tanstack/react-start/server-only";
import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "#/db";
import { mcpServerConfig } from "#/db/schema";
import { env } from "#/env";
import {
  DEFAULT_MCP_SERVER_PRESETS,
  getDefaultFeatureIds,
  isMcpServerPresetId,
  normalizeSelectedFeatureIds,
  resolveRemoteMcpServerUrl,
  type McpServerPresetId,
} from "#/lib/mcp-providers";
import { decrypt, encrypt } from "#/lib/crypto";

const MCP_ENCRYPTION_KEY = env.MCP_ENCRYPTION_KEY;

type McpServerExtraConfig = {
  selectedFeatureIds?: string[];
};

function parseJsonRecord(value: string | null | undefined) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function parseExtraConfig(configJson: string | null | undefined) {
  const parsed = parseJsonRecord(configJson);

  return {
    selectedFeatureIds: Array.isArray(parsed.selectedFeatureIds)
      ? parsed.selectedFeatureIds.filter((value): value is string =>
          typeof value === "string",
        )
      : undefined,
  } satisfies McpServerExtraConfig;
}

function serializeJsonRecord(value: Record<string, unknown>) {
  return JSON.stringify(value);
}

export async function listMcpServerConfigRows(userId: string) {
  return db
    .select({
      identifier: mcpServerConfig.identifier,
      label: mcpServerConfig.label,
      source: mcpServerConfig.source,
      transportType: mcpServerConfig.transportType,
      serverUrl: mcpServerConfig.serverUrl,
      authType: mcpServerConfig.authType,
      enabled: mcpServerConfig.enabled,
      encryptedSecret: mcpServerConfig.encryptedSecret,
      headersJson: mcpServerConfig.headersJson,
      configJson: mcpServerConfig.configJson,
    })
    .from(mcpServerConfig)
    .where(eq(mcpServerConfig.userId, userId))
    .orderBy(asc(mcpServerConfig.identifier));
}

export async function findMcpServerConfig(
  userId: string,
  identifier: string,
) {
  const [setting] = await db
    .select()
    .from(mcpServerConfig)
    .where(
      and(
        eq(mcpServerConfig.userId, userId),
        eq(mcpServerConfig.identifier, identifier),
      ),
    )
    .limit(1);

  return setting ?? null;
}

export async function listDefaultMcpServerConfigsForUser(userId: string) {
  const rows = await listMcpServerConfigRows(userId);
  const settingsByIdentifier = new Map(
    rows.map((row) => [row.identifier, row]),
  );

  return DEFAULT_MCP_SERVER_PRESETS.map((preset) => {
    const row = settingsByIdentifier.get(preset.id);
    const config = parseExtraConfig(row?.configJson);

    return {
      identifier: preset.id,
      enabled: row?.enabled ?? false,
      hasSecret: Boolean(row?.encryptedSecret),
      selectedFeatureIds: normalizeSelectedFeatureIds(
        preset.id,
        config.selectedFeatureIds,
      ),
    };
  });
}

export async function saveDefaultMcpServerConfigForUser(args: {
  apiKey?: string;
  enabled: boolean;
  identifier: McpServerPresetId;
  selectedFeatureIds?: string[];
  userId: string;
}) {
  const preset = DEFAULT_MCP_SERVER_PRESETS.find(
    (candidate) => candidate.id === args.identifier,
  );

  if (!preset) {
    throw new Error(`Unsupported MCP preset: ${args.identifier}`);
  }

  const existing = await findMcpServerConfig(args.userId, args.identifier);
  const trimmedApiKey = args.apiKey?.trim() ?? "";
  const existingConfig = parseExtraConfig(existing?.configJson);
  const nextSelectedFeatureIds = normalizeSelectedFeatureIds(
    args.identifier,
    args.selectedFeatureIds ?? existingConfig.selectedFeatureIds,
  );
  const nextEncryptedSecret = trimmedApiKey
    ? encrypt(trimmedApiKey, MCP_ENCRYPTION_KEY)
    : existing?.encryptedSecret ?? null;

  if (args.enabled && !nextEncryptedSecret) {
    throw new Error("Add your API key first before turning this on.");
  }

  if (nextSelectedFeatureIds.length === 0) {
    throw new Error("Choose at least one thing you want this source to help with.");
  }

  if (!existing && !nextEncryptedSecret && !args.enabled) {
    return;
  }

  const now = new Date();

  await db
    .insert(mcpServerConfig)
    .values({
      id: randomUUID(),
      userId: args.userId,
      identifier: preset.id,
      label: preset.label,
      source: preset.source,
      transportType: preset.transportType,
      serverUrl: preset.serverUrl,
      authType: preset.authType,
      enabled: args.enabled,
      encryptedSecret: nextEncryptedSecret,
      headersJson: existing?.headersJson ?? "{}",
      configJson: serializeJsonRecord({
        selectedFeatureIds: nextSelectedFeatureIds,
      }),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [mcpServerConfig.userId, mcpServerConfig.identifier],
      set: {
        label: preset.label,
        source: preset.source,
        transportType: preset.transportType,
        serverUrl: preset.serverUrl,
        authType: preset.authType,
        enabled: args.enabled,
        encryptedSecret: nextEncryptedSecret,
        configJson: serializeJsonRecord({
          selectedFeatureIds: nextSelectedFeatureIds,
        }),
        updatedAt: now,
      },
    });
}

export async function createEnabledMcpClientsForUser(userId: string): Promise<
  {
    client: MCPClient;
    presetId: McpServerPresetId;
    selectedFeatureIds: string[];
  }[]
> {
  const rows = await db
    .select({
      identifier: mcpServerConfig.identifier,
      transportType: mcpServerConfig.transportType,
      serverUrl: mcpServerConfig.serverUrl,
      authType: mcpServerConfig.authType,
      encryptedSecret: mcpServerConfig.encryptedSecret,
      headersJson: mcpServerConfig.headersJson,
      configJson: mcpServerConfig.configJson,
    })
    .from(mcpServerConfig)
    .where(
      and(
        eq(mcpServerConfig.userId, userId),
        eq(mcpServerConfig.enabled, true),
      ),
    )
    .orderBy(asc(mcpServerConfig.identifier));

  const clients: {
    client: MCPClient;
    presetId: McpServerPresetId;
    selectedFeatureIds: string[];
  }[] = [];

  try {
    for (const row of rows) {
      if (!isMcpServerPresetId(row.identifier)) {
        continue;
      }

      const secret = decrypt(row.encryptedSecret, MCP_ENCRYPTION_KEY)?.trim();

      if (!secret) {
        continue;
      }

      const config = parseExtraConfig(row.configJson);
      const selectedFeatureIds = normalizeSelectedFeatureIds(
        row.identifier,
        config.selectedFeatureIds ?? getDefaultFeatureIds(row.identifier),
      );
      const headers = parseJsonRecord(row.headersJson);
      const client = await createMCPClient({
        transport: {
          type: row.transportType === "sse" ? "sse" : "http",
          url: resolveRemoteMcpServerUrl({
            presetId: row.identifier,
            apiKey: secret,
            serverUrl: row.serverUrl,
            selectedFeatureIds,
          }),
          headers: Object.fromEntries(
            Object.entries(headers).filter(
              (entry): entry is [string, string] => typeof entry[1] === "string",
            ),
          ),
        },
      });

      clients.push({
        client,
        presetId: row.identifier,
        selectedFeatureIds,
      });
    }
  } catch (error) {
    await Promise.allSettled(clients.map(({ client }) => client.close()));
    throw error;
  }

  return clients;
}
