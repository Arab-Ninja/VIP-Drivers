"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  read: boolean;
  createdAt: string;
};

/** The signed-in user's own notifications. Never anyone else's. */
export async function fetchNotifications(): Promise<{
  items: NotificationItem[];
  unread: number;
}> {
  const user = await requireUser();

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(30);

  return {
    items: rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      url: row.url,
      read: row.readAt !== null,
      createdAt: row.createdAt.toISOString(),
    })),
    unread: rows.filter((row) => row.readAt === null).length,
  };
}

export async function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  const user = await requireUser();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  revalidatePath("/", "layout");
  return { ok: true };
}
