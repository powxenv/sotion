import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "#/lib/auth";
import { clearChat, getCurrentChatForUser } from "#/services/chat/server";

export const getCurrentChat = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new Response("Unauthorized", { status: 401 });
    }

    return getCurrentChatForUser(session.user.id);
  },
);

export const clearCurrentChat = createServerFn({ method: "POST" })
  .inputValidator((data: { chatId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new Response("Unauthorized", { status: 401 });
    }

    return clearChat({
      userId: session.user.id,
      chatId: data.chatId,
    });
  });

export const getCurrentChatOptions = () =>
  queryOptions({
    queryKey: ["chat", "current"],
    queryFn: getCurrentChat,
  });
