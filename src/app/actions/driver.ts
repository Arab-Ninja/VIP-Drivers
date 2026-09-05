"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { driverProfiles, users } from "@/db/schema";
import { requireUser, requireRole } from "@/lib/auth";
import { claimBooking, completeBooking } from "@/server/bookings";
import { getOperationalSettings } from "@/lib/settings";
import { notifyAdmins } from "@/server/notify";

const applicationSchema = z.object({
  companyName: z.string().trim().min(2).max(160),
  displayName: z.string().trim().max(120).optional().or(z.literal("")),
  bio: z.string().trim().max(2000).optional().or(z.literal("")),
  phone: z.string().trim().min(6).max(40),
  languages: z.array(z.string().trim().max(40)).max(10).default([]),
  yearsExperience: z.number().int().min(0).max(60).optional(),
  carMake: z.string().trim().max(60).optional().or(z.literal("")),
  carModel: z.string().trim().max(60).optional().or(z.literal("")),
  carYear: z.number().int().min(1990).max(2100).optional(),
  carColor: z.string().trim().max(60).optional().or(z.literal("")),
  licensePlate: z.string().trim().max(20).optional().or(z.literal("")),
  vatNumber: z.string().trim().max(40).optional().or(z.literal("")),
  licenseNumber: z.string().trim().max(60).optional().or(z.literal("")),
  iban: z.string().trim().max(40).optional().or(z.literal("")),
  photoUrl: z.string().trim().url().max(600).optional().or(z.literal("")),
});

export type DriverApplicationResult =
  | { ok: true; status: "pending" | "approved" }
  | { ok: false; error: string };

/**
 * Creates or updates the signed-in user's partner profile.
 *
 * Submitting an application promotes the account to the `driver` role so the
 * driver area becomes reachable, but the profile stays `pending` until an
 * admin approves it — and only approved partners can claim rides.
 */
export async function submitDriverApplication(input: unknown): Promise<DriverApplicationResult> {
  const user = await requireUser();
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.path.join(".") ?? "invalid" };
  }

  const data = parsed.data;
  const operations = await getOperationalSettings();

  const existing = await db
    .select()
    .from(driverProfiles)
    .where(eq(driverProfiles.userId, user.id))
    .limit(1);

  const values = {
    companyName: data.companyName,
    displayName: data.displayName || null,
    bio: data.bio || null,
    languages: data.languages,
    yearsExperience: data.yearsExperience ?? null,
    carMake: data.carMake || null,
    carModel: data.carModel || null,
    carYear: data.carYear ?? null,
    carColor: data.carColor || null,
    licensePlate: data.licensePlate || null,
    vatNumber: data.vatNumber || null,
    licenseNumber: data.licenseNumber || null,
    iban: data.iban || null,
    photoUrl: data.photoUrl || null,
    updatedAt: new Date(),
  };

  if (existing.length) {
    await db.update(driverProfiles).set(values).where(eq(driverProfiles.userId, user.id));
  } else {
    await db.insert(driverProfiles).values({
      userId: user.id,
      commissionBps: operations.defaultCommissionBps,
      ...values,
    });

    await notifyAdmins({
      title: "Nouvelle candidature chauffeur",
      body: `${data.companyName} a soumis une candidature.`,
      url: "/admin/drivers",
    }).catch(() => {});
  }

  await db
    .update(users)
    .set({
      phone: data.phone,
      // An admin must never be demoted by filling in a partner profile.
      role: user.role === "admin" ? "admin" : "driver",
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  revalidatePath("/driver");
  revalidatePath("/driver/profile");

  const status = existing[0]?.status === "approved" ? "approved" : "pending";
  return { ok: true, status };
}

/** A driver takes an available ride. */
export async function claimRide(bookingId: string) {
  const user = await requireRole("driver");
  const result = await claimBooking(bookingId, user.id);
  revalidatePath("/driver");
  revalidatePath("/driver/rides");
  return result;
}

/** A driver reports a ride as carried out. */
export async function markRideCompleted(bookingId: string) {
  const user = await requireRole("driver");
  const result = await completeBooking(bookingId, user.id, {
    asAdmin: user.role === "admin",
  });
  revalidatePath("/driver/rides");
  revalidatePath("/driver/earnings");
  return result;
}
