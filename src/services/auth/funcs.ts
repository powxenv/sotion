import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getServerRequest } from "#/services/shared/request";
import { getSessionForRequest } from "#/services/auth/session";

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  return getSessionForRequest(getServerRequest());
});

export const getSessionOptions = () =>
  queryOptions({
    queryKey: ["session"],
    queryFn: getSession,
  });
