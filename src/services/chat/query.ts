import { and, desc, eq } from "drizzle-orm";
import { db } from "#/db";
import { chat } from "#/db/schema";

export async function createChatRow(id: string, userId: string) {
  await db.insert(chat).values({
    id,
    userId,
    messages: "[]",
  });
}

export async function findLatestChatRow(userId: string) {
  const [record] = await db
    .select({
      id: chat.id,
      messages: chat.messages,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    })
    .from(chat)
    .where(eq(chat.userId, userId))
    .orderBy(desc(chat.updatedAt))
    .limit(1);

  return record ?? null;
}

export async function findChatRow(chatId: string, userId: string) {
  const [record] = await db
    .select({
      id: chat.id,
    })
    .from(chat)
    .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))
    .limit(1);

  return record ?? null;
}

export async function updateChatRow(args: {
  chatId: string;
  userId: string;
  messages: string;
}) {
  await db
    .update(chat)
    .set({
      messages: args.messages,
      updatedAt: new Date(),
    })
    .where(and(eq(chat.id, args.chatId), eq(chat.userId, args.userId)));
}
