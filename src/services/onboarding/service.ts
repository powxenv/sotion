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
  finish: "finish",
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

const EDITABLE_ONBOARDING_STEPS = [
  ONBOARDING_STEPS.connectWorkspace,
  ONBOARDING_STEPS.setupAiProvider,
  ONBOARDING_STEPS.finish,
] as const;

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
  const hasAiProvider = Boolean(await findAnyAiProviderSetting(userId));

  const highestUnlockedStep = record.completedAt
    ? ONBOARDING_STEPS.completed
    : hasAiProvider
      ? ONBOARDING_STEPS.finish
      : isConnected
        ? ONBOARDING_STEPS.setupAiProvider
        : ONBOARDING_STEPS.connectWorkspace;

  const nextStep = record.completedAt
    ? ONBOARDING_STEPS.completed
    : record.currentStep === ONBOARDING_STEPS.connectWorkspace && isConnected
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

  const workspaceConnectedAt =
    record.workspaceConnectedAt ?? connection?.connectedAt ?? null;
  const aiProviderSetupAt = record.aiProviderSetupAt ?? (hasAiProvider ? new Date() : null);

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

export async function setOnboardingStepForRequest(args: {
  request: Request;
  step: OnboardingStep;
}): Promise<OnboardingState> {
  const session = await requireSession(args.request);
  const synced = await syncOnboardingState(session.user.id);

  if (synced.completedAt) {
    return toState(synced);
  }

  if (!EDITABLE_ONBOARDING_STEPS.includes(args.step as (typeof EDITABLE_ONBOARDING_STEPS)[number])) {
    throw new Response("Invalid onboarding step.", { status: 400 });
  }

  const hasConnectedWorkspace = Boolean(synced.workspaceConnectedAt);
  const hasAiProvider = Boolean(synced.aiProviderSetupAt);

  if (
    args.step === ONBOARDING_STEPS.setupAiProvider &&
    !hasConnectedWorkspace
  ) {
    throw new Response("Workspace must be connected first.", { status: 400 });
  }

  if (args.step === ONBOARDING_STEPS.finish && !hasAiProvider) {
    throw new Response("At least one AI provider API key is required.", {
      status: 400,
    });
  }

  const [updated] = await db
    .update(onboardingState)
    .set({
      currentStep: args.step,
      updatedAt: new Date(),
    })
    .where(eq(onboardingState.userId, session.user.id))
    .returning();

  return toState(updated);
}
