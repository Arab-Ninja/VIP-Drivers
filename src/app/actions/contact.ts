"use server";

import { z } from "zod";
import { and, eq, gte, sql } from "drizzle-orm";

import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { sendOperationsEmail } from "@/lib/email";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  subject: z.string().trim().min(2).max(160),
  message: z.string().trim().min(10).max(4000),
});

export type ContactResult = { ok: true } | { ok: false; error: string; field?: string };

/** No more than this many messages per address per hour. */
const HOURLY_LIMIT = 5;

export async function submitContactMessage(formData: FormData): Promise<ContactResult> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: "invalid", field: issue?.path[0]?.toString() };
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();

  // A honeypot field that real people never see and never fill in.
  if (formData.get("company")) return { ok: true };

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contactMessages)
    .where(and(eq(contactMessages.email, email), gte(contactMessages.createdAt, oneHourAgo)));

  if (count >= HOURLY_LIMIT) {
    return { ok: false, error: "rate_limited" };
  }

  const user = await getCurrentUser();

  await db.insert(contactMessages).values({
    name: data.name,
    email,
    phone: data.phone || null,
    subject: data.subject,
    message: data.message,
    userId: user?.id ?? null,
  });

  // Best-effort: a failing mail provider must not lose the message, which is
  // already safely stored and visible in the admin panel.
  await sendOperationsEmail({
    subject: `Nouveau message — ${data.subject}`,
    lines: [
      `De : ${data.name} <${email}>`,
      data.phone ? `Téléphone : ${data.phone}` : "",
      "",
      data.message,
    ].filter(Boolean),
  }).catch(() => {});

  return { ok: true };
}
