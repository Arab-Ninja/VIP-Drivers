import "server-only";
import { eq, inArray } from "drizzle-orm";
import webpush from "web-push";

import { db } from "@/db";
import { driverProfiles, notifications, pushSubscriptions, users } from "@/db/schema";
import { env } from "@/lib/env";

/**
 * Notification fan-out.
 *
 * Every notification is written to the database first — that feed is what the
 * user sees in the app and it works on every device. Web push is then a
 * best-effort delivery on top: a browser that has revoked permission, or a
 * deployment with no VAPID keys, must never cause the underlying action to
 * fail.
 */

export type NotificationInput = {
  title: string;
  body: string;
  /** Where clicking the notification should take the user. */
  url?: string;
};

let vapidConfigured = false;

function ensureVapid(): boolean {
  if (!env.push.enabled) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(env.push.subject, env.push.publicKey, env.push.privateKey);
    vapidConfigured = true;
  }
  return true;
}

async function pushToUsers(userIds: string[], input: NotificationInput): Promise<void> {
  if (!ensureVapid() || userIds.length === 0) return;

  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, userIds));

  if (subscriptions.length === 0) return;

  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    url: input.url ?? "/",
  });

  const results = await Promise.allSettled(
    subscriptions.map((subscription) =>
      webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        payload,
      ),
    ),
  );

  // 404 and 410 mean the browser has thrown the subscription away for good.
  // Keeping it would make every future send fail, so prune it.
  const dead: string[] = [];
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const status = (result.reason as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) dead.push(subscriptions[index].endpoint);
    }
  });

  if (dead.length) {
    await db
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.endpoint, dead))
      .catch(() => {});
  }
}

/** Notifies one user, in-app and by push. */
export async function notifyUser(userId: string, input: NotificationInput): Promise<void> {
  await db.insert(notifications).values({
    userId,
    title: input.title,
    body: input.body,
    url: input.url ?? null,
  });
  await pushToUsers([userId], input).catch((error) => console.error("[push]", error));
}

export async function notifyUsers(userIds: string[], input: NotificationInput): Promise<void> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return;

  await db.insert(notifications).values(
    unique.map((userId) => ({
      userId,
      title: input.title,
      body: input.body,
      url: input.url ?? null,
    })),
  );
  await pushToUsers(unique, input).catch((error) => console.error("[push]", error));
}

/**
 * Announces a newly bookable ride to every approved driver. This is what puts
 * a confirmed ride in front of the partner network the moment it is paid.
 */
export async function notifyApprovedDrivers(input: NotificationInput): Promise<void> {
  // Only approved partners may claim rides, so only they are told.
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(driverProfiles, eq(users.id, driverProfiles.userId))
    .where(eq(driverProfiles.status, "approved"));

  await notifyUsers(
    rows.map((r) => r.id),
    input,
  );
}

/** Every administrator, for operational alerts. */
export async function notifyAdmins(input: NotificationInput): Promise<void> {
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  await notifyUsers(
    rows.map((r) => r.id),
    input,
  );
}
