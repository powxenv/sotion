import "@tanstack/react-start/server-only";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "#/db";
import {
  aiProviderSetting,
  mcpConnection,
  onboardingState,
} from "#/db/schema";

const NOTION_MCP_PROVIDER = "notion-mcp";

const ONBOARDING_STEPS = {
  connectWorkspace: "connect_workspace",
  setupAiProvider: "setup_ai_provider",
  finish: "finish",
  completed: "completed",
} as const;

type OnboardingStep = (typeof ONBOARDING_STEPS)[keyof typeof ONBOARDING_STEPS];

export type OnboardingState = {
  currentStep: OnboardingStep;
  completedAt: string | null;
};

type OnboardingRecord = typeof onboardingState.$inferSelect;

const EDITABLE_ONBOARDING_STEPS = [
  ONBOARDING_STEPS.connectWorkspace,
  ONBOARDING_STEPS.setupAiProvider,
  ONBOARDING_STEPS.finish,
] as const;

async function findAnyAiProviderSetting(userId: string) {
  const [setting] = await db
    .select({ id: aiProviderSetting.id })
    .from(aiProviderSetting)
    .where(eq(aiProviderSetting.userId, userId))
    .limit(1);

  return setting ?? null;
}

function toState(record: OnboardingRecord): OnboardingState {
  return {
    currentStep: record.currentStep as OnboardingStep,
    completedAt: record.completedAt?.toISOString() || null,
  };
}

async function syncOnboardingState(userId: string) {
  let [record] = await db
    .select()
    .from(onboardingState)
    .where(eq(onboardingState.userId, userId))
    .limit(1);

  if (!record) {
    const now = new Date();
    [record] = await db
      .insert(onboardingState)
      .values({
        id: randomUUID(),
        userId,
        currentStep: ONBOARDING_STEPS.connectWorkspace,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
  }

  const [connection] = await db
    .select({
      status: mcpConnection.status,
      accessToken: mcpConnection.accessToken,
      connectedAt: mcpConnection.connectedAt,
    })
    .from(mcpConnection)
    .where(
      and(
        eq(mcpConnection.userId, userId),
        eq(mcpConnection.provider, NOTION_MCP_PROVIDER),
      ),
    )
    .limit(1);
  const isConnected =
    connection?.status === "connected" && Boolean(connection.accessToken);
  const hasAiProvider = Boolean(await findAnyAiProviderSetting(userId));
  const hasFreshConnection =
    isConnected &&
    Boolean(connection?.connectedAt) &&
    (
      !record.workspaceConnectedAt ||
      connection.connectedAt.getTime() > record.workspaceConnectedAt.getTime()
    );

  const highestUnlockedStep = record.completedAt
    ? ONBOARDING_STEPS.completed
    : hasAiProvider
      ? ONBOARDING_STEPS.finish
      : isConnected
        ? ONBOARDING_STEPS.setupAiProvider
        : ONBOARDING_STEPS.connectWorkspace;

  const nextStep = record.completedAt
    ? ONBOARDING_STEPS.completed
    : record.currentStep === ONBOARDING_STEPS.connectWorkspace &&
        hasFreshConnection
      ? ONBOARDING_STEPS.setupAiProvider
      : EDITABLE_ONBOARDING_STEPS.includes(
            record.currentStep as (typeof EDITABLE_ONBOARDING_STEPS)[number],
          ) &&
            EDITABLE_ONBOARDING_STEPS.indexOf(
              record.currentStep as (typeof EDITABLE_ONBOARDING_STEPS)[number],
            ) <=
              EDITABLE_ONBOARDING_STEPS.indexOf(
                highestUnlockedStep as (typeof EDITABLE_ONBOARDING_STEPS)[number],
              )
        ? record.currentStep
        : highestUnlockedStep;

  const workspaceConnectedAt = connection?.connectedAt &&
    (
      !record.workspaceConnectedAt ||
      connection.connectedAt.getTime() > record.workspaceConnectedAt.getTime()
    )
    ? connection.connectedAt
    : record.workspaceConnectedAt ?? null;
  const aiProviderSetupAt =
    record.aiProviderSetupAt ?? (hasAiProvider ? new Date() : null);

  if (
    record.currentStep !== nextStep ||
    record.workspaceConnectedAt?.getTime() !== workspaceConnectedAt?.getTime() ||
    record.aiProviderSetupAt?.getTime() !== aiProviderSetupAt?.getTime()
  ) {
    const [updated] = await db
      .update(onboardingState)
      .set({
        currentStep: nextStep,
        workspaceConnectedAt,
        aiProviderSetupAt,
        updatedAt: new Date(),
      })
      .where(eq(onboardingState.id, record.id))
      .returning();

    return updated;
  }

  return record;
}

export async function getOnboardingStateForUser(userId: string) {
  const record = await syncOnboardingState(userId);
  return toState(record);
}

export async function completeOnboardingForUser(userId: string) {
  const synced = await syncOnboardingState(userId);

  if (synced.currentStep === ONBOARDING_STEPS.connectWorkspace) {
    throw new Response("Workspace must be connected first.", { status: 400 });
  }

  if (!(await findAnyAiProviderSetting(userId))) {
    throw new Response("At least one AI provider API key is required.", {
      status: 400,
    });
  }

  const now = new Date();
  const [updated] = await db
    .update(onboardingState)
    .set({
      currentStep: ONBOARDING_STEPS.completed,
      aiProviderSetupAt: synced.aiProviderSetupAt ?? now,
      completedAt: synced.completedAt ?? now,
      updatedAt: now,
    })
    .where(eq(onboardingState.id, synced.id))
    .returning();

  return toState(updated);
}

export async function setOnboardingStepForUser(args: {
  step: string;
  userId: string;
}) {
  const synced = await syncOnboardingState(args.userId);
  const step = args.step as OnboardingStep;

  if (synced.completedAt) {
    return toState(synced);
  }

  if (!EDITABLE_ONBOARDING_STEPS.includes(step as (typeof EDITABLE_ONBOARDING_STEPS)[number])) {
    throw new Response("Invalid onboarding step.", { status: 400 });
  }

  if (
    step === ONBOARDING_STEPS.setupAiProvider &&
    !synced.workspaceConnectedAt
  ) {
    throw new Response("Workspace must be connected first.", { status: 400 });
  }

  if (step === ONBOARDING_STEPS.finish && !synced.aiProviderSetupAt) {
    throw new Response("At least one AI provider API key is required.", {
      status: 400,
    });
  }

  const [updated] = await db
    .update(onboardingState)
    .set({
      currentStep: step,
      updatedAt: new Date(),
    })
    .where(eq(onboardingState.userId, args.userId))
    .returning();

  return toState(updated);
}
