"use server";

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  bookings,
  bookingEvents,
  contactMessages,
  driverProfiles,
  users,
  vehicleCategories,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { splitDriverEarnings } from "@/lib/pricing";
import { completeBooking } from "@/server/bookings";
import { notifyUser } from "@/server/notify";
import { sendEmail } from "@/lib/email";
import {
  SETTING_KEYS,
  writeSetting,
  type CompanyInfo,
  type OperationalSettings,
} from "@/lib/settings";
import type { PricingRules } from "@/lib/pricing";

type Result = { ok: boolean; error?: string };

/* ------------------------------------------------------------------ */
/* Bookings                                                            */
/* ------------------------------------------------------------------ */

/**
 * Assigns, reassigns or unassigns the chauffeur on a ride.
 *
 * Admins deliberately bypass the "first come, first served" rule that governs
 * drivers claiming rides themselves: an operator has to be able to move a
 * ride when a partner falls ill. Both drivers are notified so nobody drives
 * to a pickup they no longer own.
 */
export async function assignDriver(bookingId: string, driverId: string | null): Promise<Result> {
  const admin = await requireRole("admin");

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) return { ok: false, error: "not_found" };

  const previousDriverId = booking.driverId;

  if (driverId) {
    const [profile] = await db
      .select({ commissionBps: driverProfiles.commissionBps, status: driverProfiles.status })
      .from(driverProfiles)
      .where(eq(driverProfiles.userId, driverId))
      .limit(1);

    if (!profile) return { ok: false, error: "driver_not_found" };
    if (profile.status !== "approved") return { ok: false, error: "driver_not_approved" };

    const { commissionCents, driverEarningsCents } = splitDriverEarnings(
      booking.priceHtvaCents,
      profile.commissionBps,
    );

    await db
      .update(bookings)
      .set({
        driverId,
        claimedAt: new Date(),
        commissionBps: profile.commissionBps,
        commissionCents,
        driverEarningsCents,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));

    await notifyUser(driverId, {
      title: "Trajet attribué",
      body: `Le trajet ${booking.reference} vous a été attribué.`,
      url: "/driver/rides",
    }).catch(() => {});

    await notifyUser(booking.clientId, {
      title: "Chauffeur attribué",
      body: `Un chauffeur a été attribué à votre réservation ${booking.reference}.`,
      url: `/booking/${booking.reference}`,
    }).catch(() => {});
  } else {
    await db
      .update(bookings)
      .set({
        driverId: null,
        claimedAt: null,
        commissionBps: null,
        commissionCents: null,
        driverEarningsCents: null,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));
  }

  if (previousDriverId && previousDriverId !== driverId) {
    await notifyUser(previousDriverId, {
      title: "Trajet retiré",
      body: `Le trajet ${booking.reference} ne vous est plus attribué.`,
      url: "/driver",
    }).catch(() => {});
  }

  await db.insert(bookingEvents).values({
    bookingId,
    actorId: admin.id,
    type: driverId ? "driver_assigned" : "driver_unassigned",
    message: driverId ? `Assigned to ${driverId}` : "Driver removed",
  });

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/driver");
  return { ok: true };
}

const statusSchema = z.enum(["pending", "confirmed", "completed", "cancelled"]);

export async function setBookingStatus(
  bookingId: string,
  status: string,
  reason?: string,
): Promise<Result> {
  const admin = await requireRole("admin");
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "invalid_status" };

  if (parsed.data === "completed") {
    const result = await completeBooking(bookingId, admin.id, { asAdmin: true });
    revalidatePath("/admin/bookings");
    revalidatePath(`/admin/bookings/${bookingId}`);
    return result;
  }

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) return { ok: false, error: "not_found" };

  const now = new Date();
  await db
    .update(bookings)
    .set({
      status: parsed.data,
      cancelledAt: parsed.data === "cancelled" ? now : null,
      cancellationReason: parsed.data === "cancelled" ? (reason ?? null) : null,
      // "completed" is handled above, so this branch never sets it.
      completedAt: booking.completedAt,
      updatedAt: now,
    })
    .where(eq(bookings.id, bookingId));

  await db.insert(bookingEvents).values({
    bookingId,
    actorId: admin.id,
    type: `status_${parsed.data}`,
    message: reason ?? `Status set to ${parsed.data} by an admin`,
  });

  if (parsed.data === "cancelled") {
    const message = `Votre réservation ${booking.reference} a été annulée.${
      reason ? ` Motif : ${reason}` : ""
    }`;
    await notifyUser(booking.clientId, {
      title: "Réservation annulée",
      body: message,
      url: `/booking/${booking.reference}`,
    }).catch(() => {});
    if (booking.driverId) {
      await notifyUser(booking.driverId, {
        title: "Trajet annulé",
        body: `Le trajet ${booking.reference} a été annulé.`,
        url: "/driver/rides",
      }).catch(() => {});
    }
    await sendEmail({
      to: booking.contactEmail,
      subject: `VIP Drivers — réservation ${booking.reference} annulée`,
      lines: [`Bonjour ${booking.contactName},`, "", message, "", "VIP Drivers"],
    }).catch(() => {});
  }

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/account");
  return { ok: true };
}

const editSchema = z.object({
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  passengers: z.number().int().min(1).max(8).optional(),
  luggage: z.number().int().min(0).max(12).optional(),
  flightNumber: z.string().trim().max(20).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  contactName: z.string().trim().min(2).max(120).optional(),
  contactEmail: z.string().trim().email().max(200).optional(),
  contactPhone: z.string().trim().min(6).max(40).optional(),
  priceTtcCents: z.number().int().min(0).max(10_000_00).optional(),
});

/**
 * Edits the operational details of a ride.
 *
 * The price can be overridden — an operator sometimes agrees a figure by
 * phone — and when it is, the VAT split is recomputed from the same rate that
 * was stored on the booking so the invoice stays internally consistent.
 */
export async function updateBooking(bookingId: string, input: unknown): Promise<Result> {
  const admin = await requireRole("admin");
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) return { ok: false, error: "not_found" };

  const data = parsed.data;
  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (data.scheduledAt) patch.scheduledAt = new Date(data.scheduledAt);
  if (data.passengers !== undefined) patch.passengers = data.passengers;
  if (data.luggage !== undefined) patch.luggage = data.luggage;
  if (data.flightNumber !== undefined) patch.flightNumber = data.flightNumber || null;
  if (data.notes !== undefined) patch.notes = data.notes || null;
  if (data.contactName) patch.contactName = data.contactName;
  if (data.contactEmail) patch.contactEmail = data.contactEmail.toLowerCase();
  if (data.contactPhone) patch.contactPhone = data.contactPhone;

  if (data.priceTtcCents !== undefined && data.priceTtcCents !== booking.priceTtcCents) {
    const vatBps = booking.vatBps;
    // TTC = HTVA * (1 + rate), so HTVA = TTC / (1 + rate).
    const htva = Math.round(data.priceTtcCents / (1 + vatBps / 10_000));
    patch.priceTtcCents = data.priceTtcCents;
    patch.priceHtvaCents = htva;
    patch.vatCents = data.priceTtcCents - htva;

    // A driver's cut follows the fare it was calculated from.
    if (booking.driverId && booking.commissionBps !== null) {
      const split = splitDriverEarnings(htva, booking.commissionBps);
      patch.commissionCents = split.commissionCents;
      patch.driverEarningsCents = split.driverEarningsCents;
    }
  }

  await db.update(bookings).set(patch).where(eq(bookings.id, bookingId));

  await db.insert(bookingEvents).values({
    bookingId,
    actorId: admin.id,
    type: "edited",
    message: "Booking edited by an admin",
    metadata: patch as Record<string, unknown>,
  });

  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  return { ok: true };
}

/** Emails the client about a specific booking and records it in the inbox. */
export async function contactClientAboutBooking(
  bookingId: string,
  subject: string,
  message: string,
): Promise<Result> {
  const admin = await requireRole("admin");
  if (subject.trim().length < 2 || message.trim().length < 5) {
    return { ok: false, error: "invalid" };
  }

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) return { ok: false, error: "not_found" };

  await db.insert(contactMessages).values({
    name: booking.contactName,
    email: booking.contactEmail,
    phone: booking.contactPhone,
    subject,
    message,
    status: "answered",
    userId: booking.clientId,
    bookingId,
    adminReply: message,
    repliedAt: new Date(),
  });

  await notifyUser(booking.clientId, {
    title: subject,
    body: message.slice(0, 160),
    url: `/booking/${booking.reference}`,
  }).catch(() => {});

  await sendEmail({
    to: booking.contactEmail,
    subject: `VIP Drivers — ${subject}`,
    lines: [`Bonjour ${booking.contactName},`, "", message, "", "VIP Drivers"],
  }).catch(() => {});

  await db.insert(bookingEvents).values({
    bookingId,
    actorId: admin.id,
    type: "client_contacted",
    message: subject,
  });

  revalidatePath(`/admin/bookings/${bookingId}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Drivers and clients                                                 */
/* ------------------------------------------------------------------ */

const driverStatusSchema = z.enum(["pending", "approved", "suspended", "rejected"]);

export async function setDriverStatus(userId: string, status: string): Promise<Result> {
  await requireRole("admin");
  const parsed = driverStatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "invalid_status" };

  await db
    .update(driverProfiles)
    .set({
      status: parsed.data,
      approvedAt: parsed.data === "approved" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(driverProfiles.userId, userId));

  const titles: Record<string, string> = {
    approved: "Candidature approuvée",
    suspended: "Compte suspendu",
    rejected: "Candidature refusée",
    pending: "Candidature en réexamen",
  };
  await notifyUser(userId, {
    title: titles[parsed.data],
    body:
      parsed.data === "approved"
        ? "Vous pouvez désormais accepter des trajets."
        : "Contactez l'administration pour plus d'informations.",
    url: "/driver",
  }).catch(() => {});

  revalidatePath("/admin/drivers");
  return { ok: true };
}

export async function setDriverCommission(userId: string, commissionBps: number): Promise<Result> {
  await requireRole("admin");
  if (!Number.isInteger(commissionBps) || commissionBps < 0 || commissionBps > 5000) {
    return { ok: false, error: "invalid" };
  }

  await db
    .update(driverProfiles)
    .set({ commissionBps, updatedAt: new Date() })
    .where(eq(driverProfiles.userId, userId));

  revalidatePath("/admin/drivers");
  return { ok: true };
}

export async function setUserBlocked(userId: string, blocked: boolean): Promise<Result> {
  const admin = await requireRole("admin");
  // Locking yourself out of your own admin panel is not a recoverable
  // mistake from inside the app, so it is refused.
  if (userId === admin.id) return { ok: false, error: "cannot_block_self" };

  await db
    .update(users)
    .set({ blockedAt: blocked ? new Date() : null, updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath("/admin/clients");
  revalidatePath("/admin/drivers");
  return { ok: true };
}

const roleSchema = z.enum(["client", "driver", "admin"]);

export async function setUserRole(userId: string, role: string): Promise<Result> {
  const admin = await requireRole("admin");
  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) return { ok: false, error: "invalid_role" };
  if (userId === admin.id) return { ok: false, error: "cannot_change_own_role" };

  await db.update(users).set({ role: parsed.data, updatedAt: new Date() }).where(eq(users.id, userId));
  revalidatePath("/admin/clients");
  revalidatePath("/admin/drivers");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Fleet                                                               */
/* ------------------------------------------------------------------ */

const vehicleSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "slug"),
  name: z.string().trim().min(2).max(120),
  year: z.number().int().min(1990).max(2100),
  descriptionFr: z.string().trim().max(4000),
  descriptionEn: z.string().trim().max(4000),
  pricePerKmCents: z.number().int().min(0).max(100_000),
  pricePerHourCents: z.number().int().min(0).max(1_000_000),
  minimumPriceCents: z.number().int().min(0).max(1_000_000),
  passengerCapacity: z.number().int().min(1).max(20),
  luggageCapacity: z.number().int().min(0).max(30),
  imageUrls: z.array(z.string().trim().max(600)).max(12),
  featuresFr: z.array(z.string().trim().max(120)).max(30),
  featuresEn: z.array(z.string().trim().max(120)).max(30),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});

export async function upsertVehicle(id: string | null, input: unknown): Promise<Result> {
  await requireRole("admin");
  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.path.join(".") ?? "invalid" };
  }

  try {
    if (id) {
      await db
        .update(vehicleCategories)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(vehicleCategories.id, id));
    } else {
      await db.insert(vehicleCategories).values(parsed.data);
    }
  } catch (error) {
    console.error("[upsertVehicle]", error);
    return { ok: false, error: "slug_taken" };
  }

  revalidatePath("/admin/vehicles");
  revalidatePath("/fleet");
  revalidatePath("/booking");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Hides a vehicle rather than deleting it when bookings reference it, so an
 * old invoice can still name the car it was made for.
 */
export async function deleteVehicle(id: string): Promise<Result & { hidden?: boolean }> {
  await requireRole("admin");

  const [used] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.vehicleCategoryId, id))
    .limit(1);

  if (used) {
    await db
      .update(vehicleCategories)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(vehicleCategories.id, id));
    revalidatePath("/admin/vehicles");
    revalidatePath("/fleet");
    return { ok: true, hidden: true };
  }

  await db.delete(vehicleCategories).where(eq(vehicleCategories.id, id));
  revalidatePath("/admin/vehicles");
  revalidatePath("/fleet");
  revalidatePath("/booking");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Settings and messages                                               */
/* ------------------------------------------------------------------ */

export async function saveCompanyInfo(input: CompanyInfo): Promise<Result> {
  const admin = await requireRole("admin");
  await writeSetting(SETTING_KEYS.company, input, admin.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function savePricingRules(input: PricingRules): Promise<Result> {
  const admin = await requireRole("admin");
  if (input.vatBps < 0 || input.vatBps > 5000) return { ok: false, error: "invalid_vat" };
  await writeSetting(SETTING_KEYS.pricing, input, admin.id);
  revalidatePath("/booking");
  return { ok: true };
}

export async function saveOperationalSettings(input: OperationalSettings): Promise<Result> {
  const admin = await requireRole("admin");
  await writeSetting(SETTING_KEYS.operations, input, admin.id);
  revalidatePath("/booking");
  return { ok: true };
}

export async function setMessageStatus(messageId: string, status: string): Promise<Result> {
  await requireRole("admin");
  const parsed = z.enum(["new", "read", "answered", "archived"]).safeParse(status);
  if (!parsed.success) return { ok: false, error: "invalid" };

  await db
    .update(contactMessages)
    .set({ status: parsed.data })
    .where(eq(contactMessages.id, messageId));

  revalidatePath("/admin/messages");
  return { ok: true };
}

export async function replyToMessage(messageId: string, reply: string): Promise<Result> {
  await requireRole("admin");
  if (reply.trim().length < 5) return { ok: false, error: "invalid" };

  const [message] = await db
    .select()
    .from(contactMessages)
    .where(eq(contactMessages.id, messageId))
    .limit(1);
  if (!message) return { ok: false, error: "not_found" };

  await db
    .update(contactMessages)
    .set({ adminReply: reply, repliedAt: new Date(), status: "answered" })
    .where(eq(contactMessages.id, messageId));

  if (message.userId) {
    await notifyUser(message.userId, {
      title: `Réponse : ${message.subject}`,
      body: reply.slice(0, 160),
      url: "/account",
    }).catch(() => {});
  }

  await sendEmail({
    to: message.email,
    subject: `VIP Drivers — ${message.subject}`,
    lines: [`Bonjour ${message.name},`, "", reply, "", "VIP Drivers"],
  }).catch(() => {});

  revalidatePath("/admin/messages");
  return { ok: true };
}
