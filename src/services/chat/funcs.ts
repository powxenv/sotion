import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
  createChatForRequest,
  getCurrentChatForRequest,
  listChatsForRequest,
  loadChatForRequest,
} from "#/services/chat/service";
import { getServerRequest } from "#/services/shared/request";

export const createChatSession = createServerFn({ method: "POST" }).handler(
  async () => ({ id: await createChatForRequest(getServerRequest()) }),
);

export const listChats = createServerFn({ method: "GET" }).handler(async () => {
  return listChatsForRequest(getServerRequest());
});

export const getChat = createServerFn({ method: "GET" })
  .inputValidator((chatId: string) => chatId)
  .handler(async ({ data }) => loadChatForRequest(getServerRequest(), data));

export const getCurrentChat = createServerFn({ method: "GET" }).handler(
  async () => getCurrentChatForRequest(getServerRequest()),
);

export const listChatsOptions = () =>
  queryOptions({
    queryKey: ["chats"],
    queryFn: listChats,
  });

export const getChatOptions = (chatId: string) =>
  queryOptions({
    queryKey: ["chat", chatId],
    queryFn: () => getChat({ data: chatId }),
  });

export const getCurrentChatOptions = () =>
  queryOptions({
    queryKey: ["chat", "current"],
    queryFn: getCurrentChat,
  });
