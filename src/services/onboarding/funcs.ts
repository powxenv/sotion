import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "#/lib/auth";
import {
  completeOnboardingForUser,
  getOnboardingStateForUser,
  setOnboardingStepForUser,
} from "#/services/onboarding/server";

export const getOnboardingState = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new Response("Unauthorized", { status: 401 });
    }

    return getOnboardingStateForUser(session.user.id);
  },
);

export const completeOnboarding = createServerFn({ method: "POST" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new Response("Unauthorized", { status: 401 });
    }

    return completeOnboardingForUser(session.user.id);
  },
);

export const setOnboardingStep = createServerFn({ method: "POST" })
  .inputValidator((data: { step: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new Response("Unauthorized", { status: 401 });
    }

    return setOnboardingStepForUser({
      step: data.step,
      userId: session.user.id,
    });
  });

export const getOnboardingStateOptions = () =>
  queryOptions({
    queryKey: ["onboarding-state"],
    queryFn: getOnboardingState,
  });
