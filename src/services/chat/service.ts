import { generateId, type UIMessage } from "ai";
import { requireSession } from "#/services/auth/session";
import {
  createChatRow,
  findChatRow,
  listChatRows,
  updateChatRow,
} from "#/services/chat/query";

export type ChatMessage = UIMessage<{}>;

export type ChatRecord = {
  id: string;
  title: string;
  messagesJson: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatSummary = {
  id: string;
  title: string;
  preview: string;
  messageCount: number;
  updatedAt: string;
};

function parseMessages(value: string): ChatMessage[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function getMessageText(message: ChatMessage | undefined): string {
  if (!message) {
    return "";
  }

  const parts = Array.isArray(message.parts) ? message.parts : [];
  const text = parts
    .map((part) => {
      if (part.type === "text") {
        return part.text;
      }

      return "";
    })
    .join(" ")
    .trim();

  if (text) {
    return text;
  }

  if ("content" in message && typeof message.content === "string") {
    return message.content.trim();
  }

  return "";
}

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function deriveChatTitle(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const text = getMessageText(firstUserMessage);

  if (!text) {
    return "Untitled chat";
  }

  return truncate(text, 60);
}

function deriveChatPreview(messages: ChatMessage[]): string {
  const lastRelevantMessage =
    [...messages].reverse().find((message) => getMessageText(message)) || messages[0];
  const text = getMessageText(lastRelevantMessage);

  if (!text) {
    return "No messages yet";
  }

  return truncate(text, 96);
}

export async function createChatForRequest(request: Request): Promise<string> {
  const session = await requireSession(request);
  const id = generateId();

  await createChatRow(id, session.user.id);

  return id;
}

export async function listChatsForRequest(
  request: Request,
): Promise<ChatSummary[]> {
  const session = await requireSession(request);
  const chats = await listChatRows(session.user.id);

  return chats.map((record) => {
    const messages = parseMessages(record.messages);

    return {
      id: record.id,
      title: record.title || deriveChatTitle(messages),
      preview: deriveChatPreview(messages),
      messageCount: messages.length,
      updatedAt: record.updatedAt.toISOString(),
    };
  });
}

export async function loadChatForRequest(
  request: Request,
  chatId: string,
): Promise<ChatRecord | null> {
  const session = await requireSession(request);
  const record = await findChatRow(chatId, session.user.id);

  if (!record) {
    return null;
  }

  return {
    id: record.id,
    title: record.title || deriveChatTitle(parseMessages(record.messages)),
    messagesJson: record.messages,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function saveChatForRequest(args: {
  request: Request;
  chatId: string;
  messages: ChatMessage[];
}): Promise<void> {
  const session = await requireSession(args.request);
  const title = deriveChatTitle(args.messages);
  const existing = await findChatRow(args.chatId, session.user.id);

  if (!existing) {
    throw new Response("Chat not found", { status: 404 });
  }

  await updateChatRow({
    chatId: args.chatId,
    userId: session.user.id,
    title,
    messages: JSON.stringify(args.messages),
  });
}
