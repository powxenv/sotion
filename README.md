# Sotion

Sotion is an AI-assisted social content workspace built around Notion.

It helps users connect Notion, draft social posts with AI, keep content organized in a dedicated Notion workspace, and publish approved text posts to connected platforms.

## Demo

https://github.com/user-attachments/assets/4f2e9bb9-f75e-4c22-ab85-b3700d202a51

## Key Features

- Connect Notion with **Notion MCP**
- Guided onboarding for Notion + AI provider setup
- Chat-based workflow for planning, drafting, and rewriting content
- Dedicated Notion workspace for social content management
- Multiple AI provider support:
  - OpenRouter
  - OpenAI
  - Claude
  - DeepSeek
  - Moonshot AI
  - Z.AI
- Social account connection for **X** and **LinkedIn**
- Approval-based publishing for text posts
- Optional MCP online research sources:
  - Exa
  - Tavily

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Create `.env.local`

```bash
SERVER_URL=http://localhost:7634
VITE_APP_TITLE=Sotion

DATABASE_URL=postgres://user:password@localhost:5432/sotion
DATABASE_POOL_URL=postgres://user:password@localhost:5432/sotion

NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=

X_CLIENT_ID=
X_CLIENT_SECRET=

LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

THREADS_CLIENT_ID=
THREADS_CLIENT_SECRET=

MCP_ENCRYPTION_KEY=replace-with-a-random-secret-at-least-32-chars
AI_PROVIDER_ENCRYPTION_KEY=replace-with-a-different-random-secret-at-least-32-chars
```

Notes:

- `DATABASE_URL` is used by the app
- `DATABASE_POOL_URL` is used by Drizzle Kit
- `MCP_ENCRYPTION_KEY` is used to encrypt MCP-related secrets
- `AI_PROVIDER_ENCRYPTION_KEY` is used to encrypt AI provider API keys

### 3. Run database migrations

```bash
bun run db:migrate
```

### 4. Start development server

```bash
bun run dev
```

Open `http://localhost:7634`

## Scripts

```bash
bun run dev
bun run build
bun run start
bun run preview
bun run test

bun run db:generate
bun run db:migrate
bun run db:push
bun run db:pull
bun run db:studio
```

