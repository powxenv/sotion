import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentChatForRequest } from "#/services/chat/service";
import { getServerRequest } from "#/services/shared/request";

export const getCurrentChat = createServerFn({ method: "GET" }).handler(
  async () => getCurrentChatForRequest(getServerRequest()),
);

export const getCurrentChatOptions = () =>
  queryOptions({
    queryKey: ["chat", "current"],
    queryFn: getCurrentChat,
  });
