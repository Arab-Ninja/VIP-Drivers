"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().trim().min(2, "name").max(120),
  email: z.string().trim().email("email").max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  password: z.string().min(8, "password").max(200),
});

export type RegisterResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "email_taken" | "use_oauth" | "server"; field?: string };

/**
 * Creates a password account. The caller signs in afterwards through the
 * credentials provider, so there is exactly one code path that establishes a
 * session.
 */
export async function registerAccount(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid", field: parsed.error.issues[0]?.message };
  }

  const { name, phone, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  try {
    const [existing] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      /* A row with no password belongs either to someone who signed in with
         Google, or to a guest who booked with this address. Letting anyone
         set a password on it would hand them that person's bookings, so it is
         refused — but with a message that points at the way in rather than a
         flat "already taken", which would look like a dead end to the very
         person who owns the address. */
      return { ok: false, error: existing.passwordHash ? "email_taken" : "use_oauth" };
    }

    await db.insert(users).values({
      name,
      email,
      phone: phone || null,
      passwordHash: await hashPassword(password),
      role: "client",
    });

    return { ok: true };
  } catch (error) {
    console.error("[register] failed", error);
    return { ok: false, error: "server" };
  }
}
