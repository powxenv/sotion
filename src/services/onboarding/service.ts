import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "#/db";
import { onboardingState } from "#/db/schema";
import { requireSession } from "#/services/auth/session";
import {
  findAnyAiProviderSetting,
  findConnectedNotionWorkspace,
  findOnboardingState,
} from "#/services/onboarding/query";

export const ONBOARDING_STEPS = {
  connectWorkspace: "connect_workspace",
  setupAiProvider: "setup_ai_provider",
  completed: "completed",
} as const;

export type OnboardingStep =
  (typeof ONBOARDING_STEPS)[keyof typeof ONBOARDING_STEPS];

export type OnboardingState = {
  currentStep: OnboardingStep;
  workspaceConnectedAt: string | null;
  aiProviderSetupAt: string | null;
  completedAt: string | null;
};

type OnboardingRecord = typeof onboardingState.$inferSelect;

async function ensureOnboardingState(userId: string) {
  const existing = await findOnboardingState(userId);
  if (existing) {
    return existing;
  }

  const now = new Date();
  const [created] = await db
    .insert(onboardingState)
    .values({
      id: randomUUID(),
      userId,
      currentStep: ONBOARDING_STEPS.connectWorkspace,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return created;
}

function toState(record: OnboardingRecord): OnboardingState {
  return {
    currentStep: record.currentStep as OnboardingStep,
    workspaceConnectedAt: record.workspaceConnectedAt?.toISOString() || null,
    aiProviderSetupAt: record.aiProviderSetupAt?.toISOString() || null,
    completedAt: record.completedAt?.toISOString() || null,
  };
}

async function syncOnboardingState(userId: string) {
  const record = await ensureOnboardingState(userId);
  const connection = await findConnectedNotionWorkspace(userId);
  const isConnected =
    connection?.status === "connected" && Boolean(connection.accessToken);

  const nextStep = record.completedAt
    ? ONBOARDING_STEPS.completed
    : isConnected
      ? ONBOARDING_STEPS.setupAiProvider
      : ONBOARDING_STEPS.connectWorkspace;

  const workspaceConnectedAt =
    record.workspaceConnectedAt ?? connection?.connectedAt ?? null;

  if (
    record.currentStep !== nextStep ||
    record.workspaceConnectedAt?.getTime() !== workspaceConnectedAt?.getTime()
  ) {
    const [updated] = await db
      .update(onboardingState)
      .set({
        currentStep: nextStep,
        workspaceConnectedAt,
        updatedAt: new Date(),
      })
      .where(eq(onboardingState.id, record.id))
      .returning();

    return updated;
  }

  return record;
}

export async function getOnboardingStateForRequest(
  request: Request,
): Promise<OnboardingState> {
  const session = await requireSession(request);
  const record = await syncOnboardingState(session.user.id);
  return toState(record);
}

export async function completeOnboardingForRequest(
  request: Request,
): Promise<OnboardingState> {
  const session = await requireSession(request);
  const synced = await syncOnboardingState(session.user.id);

  if (synced.currentStep === ONBOARDING_STEPS.connectWorkspace) {
    throw new Response("Workspace must be connected first.", { status: 400 });
  }

  if (!(await findAnyAiProviderSetting(session.user.id))) {
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
