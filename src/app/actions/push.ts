"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
});

/**
 * Stores a browser's push endpoint against the signed-in user.
 *
 * Endpoints are unique: re-subscribing on the same device updates the keys
 * rather than accumulating duplicate rows that would each deliver the same
 * notification.
 */
export async function savePushSubscription(
  input: unknown,
  userAgent?: string,
): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false };

  await db
    .insert(pushSubscriptions)
    .values({
      userId: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userAgent: userAgent?.slice(0, 300) ?? null,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId: user.id,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
      },
    });

  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  await db
    .delete(pushSubscriptions)
    .where(
      and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, user.id)),
    );
  return { ok: true };
}
