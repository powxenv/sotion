import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const mcpClientRegistration = pgTable(
  "mcp_client_registration",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    issuer: text("issuer").notNull(),
    serverUrl: text("server_url").notNull(),
    redirectUri: text("redirect_uri").notNull(),
    clientId: text("client_id").notNull(),
    clientSecret: text("client_secret"),
    tokenEndpointAuthMethod: text("token_endpoint_auth_method").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("mcp_client_registration_provider_issuer_redirect_idx").on(
      table.provider,
      table.issuer,
      table.redirectUri,
    ),
  ],
);

export const mcpConnection = pgTable(
  "mcp_connection",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    registrationId: text("registration_id").references(
      () => mcpClientRegistration.id,
      { onDelete: "set null" },
    ),
    serverUrl: text("server_url").notNull(),
    resourceUrl: text("resource_url").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenType: text("token_type"),
    scope: text("scope"),
    status: text("status").notNull().default("disconnected"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    connectedAt: timestamp("connected_at"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("mcp_connection_user_provider_idx").on(
      table.userId,
      table.provider,
    ),
    index("mcp_connection_registration_idx").on(table.registrationId),
  ],
);

export const mcpOAuthState = pgTable(
  "mcp_oauth_state",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    state: text("state").notNull(),
    redirectUri: text("redirect_uri").notNull(),
    serverUrl: text("server_url").notNull(),
    resourceUrl: text("resource_url").notNull(),
    codeVerifier: text("code_verifier"),
    returnTo: text("return_to"),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("mcp_oauth_state_state_idx").on(table.state),
    index("mcp_oauth_state_user_provider_idx").on(table.userId, table.provider),
  ],
);

export const chat = pgTable(
  "chat",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title"),
    messages: text("messages").notNull().default("[]"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("chat_user_id_idx").on(table.userId),
    index("chat_user_updated_at_idx").on(table.userId, table.updatedAt),
  ],
);

export const onboardingState = pgTable(
  "onboarding_state",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    currentStep: text("current_step").notNull().default("connect_workspace"),
    workspaceConnectedAt: timestamp("workspace_connected_at"),
    aiProviderSetupAt: timestamp("ai_provider_setup_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("onboarding_state_user_idx").on(table.userId)],
);

export const notionWorkspace = pgTable(
  "notion_workspace",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    purpose: text("purpose").notNull().default("social_media_management"),
    pageId: text("page_id").notNull(),
    databaseId: text("database_id").notNull(),
    source: text("source").notNull().default("manual"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("notion_workspace_user_purpose_idx").on(
      table.userId,
      table.purpose,
    ),
    index("notion_workspace_user_idx").on(table.userId),
  ],
);

export const aiProviderSetting = pgTable(
  "ai_provider_setting",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    encryptedApiKey: text("encrypted_api_key").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("ai_provider_setting_user_provider_idx").on(
      table.userId,
      table.provider,
    ),
    index("ai_provider_setting_user_idx").on(table.userId),
  ],
);

export const mcpServerConfig = pgTable(
  "mcp_server_config",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    identifier: text("identifier").notNull(),
    label: text("label").notNull(),
    source: text("source").notNull().default("default"),
    transportType: text("transport_type").notNull().default("http"),
    serverUrl: text("server_url").notNull(),
    authType: text("auth_type").notNull().default("api_key"),
    enabled: boolean("enabled").notNull().default(false),
    encryptedSecret: text("encrypted_secret"),
    headersJson: text("headers_json").notNull().default("{}"),
    configJson: text("config_json").notNull().default("{}"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("mcp_server_config_user_identifier_idx").on(
      table.userId,
      table.identifier,
    ),
    index("mcp_server_config_user_idx").on(table.userId),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  mcpConnections: many(mcpConnection),
  mcpOAuthStates: many(mcpOAuthState),
  chats: many(chat),
  onboardingStates: many(onboardingState),
  aiProviderSettings: many(aiProviderSetting),
  mcpServerConfigs: many(mcpServerConfig),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const mcpConnectionRelations = relations(mcpConnection, ({ one }) => ({
  user: one(user, {
    fields: [mcpConnection.userId],
    references: [user.id],
  }),
  registration: one(mcpClientRegistration, {
    fields: [mcpConnection.registrationId],
    references: [mcpClientRegistration.id],
  }),
}));

export const mcpOAuthStateRelations = relations(mcpOAuthState, ({ one }) => ({
  user: one(user, {
    fields: [mcpOAuthState.userId],
    references: [user.id],
  }),
}));

export const chatRelations = relations(chat, ({ one }) => ({
  user: one(user, {
    fields: [chat.userId],
    references: [user.id],
  }),
}));

export const onboardingStateRelations = relations(
  onboardingState,
  ({ one }) => ({
    user: one(user, {
      fields: [onboardingState.userId],
      references: [user.id],
    }),
  }),
);

export const aiProviderSettingRelations = relations(
  aiProviderSetting,
  ({ one }) => ({
    user: one(user, {
      fields: [aiProviderSetting.userId],
      references: [user.id],
    }),
  }),
);

export const mcpServerConfigRelations = relations(
  mcpServerConfig,
  ({ one }) => ({
    user: one(user, {
      fields: [mcpServerConfig.userId],
      references: [user.id],
    }),
  }),
);
