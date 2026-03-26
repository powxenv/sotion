import { generateId, type UIMessage, validateUIMessages } from "ai";
import { requireSession } from "#/services/auth/session";
import {
  createChatRow,
  findChatRow,
  findLatestChatRow,
  updateChatRow,
} from "#/services/chat/query";

export async function getCurrentChatForRequest(request: Request) {
  const session = await requireSession(request);
  const existing = await findLatestChatRow(session.user.id);

  if (existing) {
    try {
      await validateUIMessages<UIMessage<{}>>({
        messages: JSON.parse(existing.messages),
      });

      return {
        id: existing.id,
        messagesJson: existing.messages,
      };
    } catch {
      return {
        id: existing.id,
        messagesJson: "[]",
      };
    }
  }

  const id = generateId();

  await createChatRow(id, session.user.id);

  return {
    id,
    messagesJson: "[]",
  };
}

export async function saveChatForRequest(args: {
  request: Request;
  chatId: string;
  messages: UIMessage[];
}): Promise<void> {
  const session = await requireSession(args.request);
  const existing = await findChatRow(args.chatId, session.user.id);

  if (!existing) {
    throw new Response("Chat not found", { status: 404 });
  }

  await updateChatRow({
    chatId: args.chatId,
    userId: session.user.id,
    messages: JSON.stringify(args.messages),
  });
}
