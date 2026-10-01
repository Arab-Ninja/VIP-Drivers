import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { notifications, type Notification } from "@/db/schema";

export async function listNotifications(userId: string, limit = 30): Promise<Notification[]> {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return Number(row?.value ?? 0);
}
