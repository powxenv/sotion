import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getServerRequest } from "#/services/shared/request";
import {
  completeOnboardingForRequest,
  getOnboardingStateForRequest,
  setOnboardingStepForRequest,
} from "#/services/onboarding/service";

export const getOnboardingState = createServerFn({ method: "GET" }).handler(
  async () => getOnboardingStateForRequest(getServerRequest()),
);

export const completeOnboarding = createServerFn({ method: "POST" }).handler(
  async () => completeOnboardingForRequest(getServerRequest()),
);

export const setOnboardingStep = createServerFn({ method: "POST" })
  .inputValidator((data: { step: string }) => data)
  .handler(async ({ data }) => {
    return setOnboardingStepForRequest({
      request: getServerRequest(),
      step: data.step as Parameters<typeof setOnboardingStepForRequest>[0]["step"],
    });
  });

export const getOnboardingStateOptions = () =>
  queryOptions({
    queryKey: ["onboarding-state"],
    queryFn: getOnboardingState,
  });
