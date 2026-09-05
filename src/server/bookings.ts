import "server-only";
import { and, asc, desc, eq, isNull, ne } from "drizzle-orm";

import { db } from "@/db";
import {
  bookings,
  bookingEvents,
  driverProfiles,
  users,
  vehicleCategories,
  type Booking,
  type BookingStatus,
} from "@/db/schema";
import { splitDriverEarnings } from "@/lib/pricing";
import { notifyApprovedDrivers, notifyUser, notifyAdmins } from "@/server/notify";
import { formatDateTime } from "@/lib/utils";

/** A booking joined with the details every screen needs to render it. */
export type BookingWithRelations = {
  booking: Booking;
  vehicle: { id: string; name: string; slug: string; imageUrls: string[] };
  client: { id: string; name: string | null; email: string | null; phone: string | null };
  driver: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    companyName: string | null;
  } | null;
};

export async function getBookingWithRelations(
  by: { id: string } | { reference: string },
): Promise<BookingWithRelations | null> {
  const condition = "id" in by ? eq(bookings.id, by.id) : eq(bookings.reference, by.reference);

  const [row] = await db
    .select({
      booking: bookings,
      vehicle: {
        id: vehicleCategories.id,
        name: vehicleCategories.name,
        slug: vehicleCategories.slug,
        imageUrls: vehicleCategories.imageUrls,
      },
      client: {
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
      },
    })
    .from(bookings)
    .innerJoin(vehicleCategories, eq(bookings.vehicleCategoryId, vehicleCategories.id))
    .innerJoin(users, eq(bookings.clientId, users.id))
    .where(condition)
    .limit(1);

  if (!row) return null;

  let driver: BookingWithRelations["driver"] = null;
  if (row.booking.driverId) {
    const [d] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        companyName: driverProfiles.companyName,
      })
      .from(users)
      .leftJoin(driverProfiles, eq(driverProfiles.userId, users.id))
      .where(eq(users.id, row.booking.driverId))
      .limit(1);
    driver = d ?? null;
  }

  return { ...row, driver };
}

/* ------------------------------------------------------------------ */
/* Payment                                                             */
/* ------------------------------------------------------------------ */

/**
 * Moves a booking from `pending` to `confirmed` once payment lands.
 *
 * Written to be safe to call twice: Stripe retries webhooks, and a duplicate
 * delivery must not re-notify every driver. The conditional UPDATE is the
 * guard — if the row is already paid it matches nothing and the function
 * returns false.
 */
export async function markBookingPaid(
  bookingId: string,
  meta: { provider: string; paymentIntentId?: string },
): Promise<boolean> {
  const now = new Date();

  const updated = await db
    .update(bookings)
    .set({
      status: "confirmed",
      paymentStatus: "paid",
      paidAt: now,
      updatedAt: now,
      stripePaymentIntentId: meta.paymentIntentId ?? null,
    })
    .where(and(eq(bookings.id, bookingId), ne(bookings.paymentStatus, "paid")))
    .returning();

  if (updated.length === 0) return false;
  const booking = updated[0];

  await db.insert(bookingEvents).values({
    bookingId,
    type: "paid",
    message: `Payment received via ${meta.provider}`,
    metadata: { provider: meta.provider, amountCents: booking.priceTtcCents },
  });

  const when = formatDateTime(booking.scheduledAt, "fr-BE");

  // The ride is now live and claimable, so the partner network is told.
  await notifyApprovedDrivers({
    title: "Nouveau trajet disponible",
    body: `${booking.reference} — ${when} — ${booking.pickupAddress}`,
    url: "/driver",
  }).catch(() => {});

  await notifyUser(booking.clientId, {
    title: "Réservation confirmée",
    body: `Votre réservation ${booking.reference} est confirmée pour le ${when}.`,
    url: `/booking/${booking.reference}`,
  }).catch(() => {});

  await notifyAdmins({
    title: "Réservation payée",
    body: `${booking.reference} confirmée.`,
    url: `/admin/bookings/${booking.id}`,
  }).catch(() => {});

  return true;
}

/* ------------------------------------------------------------------ */
/* Driver assignment                                                   */
/* ------------------------------------------------------------------ */

export type ClaimResult =
  | { ok: true }
  | { ok: false; error: "taken" | "not_found" | "not_approved" | "not_claimable" };

/**
 * Assigns a ride to a driver.
 *
 * The whole guarantee that "only one driver can be attributed for each ride"
 * lives in the WHERE clause: the update only matches while driver_id is still
 * NULL. Two drivers tapping at the same instant both issue the statement, one
 * updates a row and the other updates none. No transaction or lock needed,
 * and it holds even across separate serverless instances.
 */
export async function claimBooking(bookingId: string, driverId: string): Promise<ClaimResult> {
  const [profile] = await db
    .select({ status: driverProfiles.status, commissionBps: driverProfiles.commissionBps })
    .from(driverProfiles)
    .where(eq(driverProfiles.userId, driverId))
    .limit(1);

  if (!profile) return { ok: false, error: "not_found" };
  if (profile.status !== "approved") return { ok: false, error: "not_approved" };

  const [target] = await db
    .select({ priceHtvaCents: bookings.priceHtvaCents, status: bookings.status })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!target) return { ok: false, error: "not_found" };
  if (target.status !== "confirmed") return { ok: false, error: "not_claimable" };

  const { commissionCents, driverEarningsCents } = splitDriverEarnings(
    target.priceHtvaCents,
    profile.commissionBps,
  );

  const claimed = await db
    .update(bookings)
    .set({
      driverId,
      claimedAt: new Date(),
      commissionBps: profile.commissionBps,
      commissionCents,
      driverEarningsCents,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(bookings.id, bookingId),
        isNull(bookings.driverId),
        eq(bookings.status, "confirmed"),
      ),
    )
    .returning();

  if (claimed.length === 0) return { ok: false, error: "taken" };
  const booking = claimed[0];

  await db.insert(bookingEvents).values({
    bookingId,
    actorId: driverId,
    type: "claimed",
    message: "Ride claimed by a driver",
    metadata: { commissionBps: profile.commissionBps, driverEarningsCents },
  });

  await notifyUser(booking.clientId, {
    title: "Chauffeur attribué",
    body: `Un chauffeur a été attribué à votre réservation ${booking.reference}.`,
    url: `/booking/${booking.reference}`,
  }).catch(() => {});

  return { ok: true };
}

/** Marks a claimed ride as carried out. */
export async function completeBooking(
  bookingId: string,
  actorId: string,
  opts: { asAdmin?: boolean } = {},
): Promise<{ ok: boolean; error?: string }> {
  const conditions = [eq(bookings.id, bookingId), eq(bookings.status, "confirmed")];
  if (!opts.asAdmin) conditions.push(eq(bookings.driverId, actorId));

  const updated = await db
    .update(bookings)
    .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
    .where(and(...conditions))
    .returning();

  if (updated.length === 0) return { ok: false, error: "not_completable" };

  await db.insert(bookingEvents).values({
    bookingId,
    actorId,
    type: "completed",
    message: opts.asAdmin ? "Marked completed by an admin" : "Marked completed by the driver",
  });

  await notifyUser(updated[0].clientId, {
    title: "Trajet terminé",
    body: `Votre trajet ${updated[0].reference} est terminé. Merci de votre confiance.`,
    url: `/booking/${updated[0].reference}`,
  }).catch(() => {});

  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Listings                                                            */
/* ------------------------------------------------------------------ */

export type BoardBooking = Awaited<ReturnType<typeof getAvailableRides>>[number];

/**
 * The drivers' "Available rides" board: confirmed and paid rides that no
 * chauffeur has taken yet, soonest first.
 */
export async function getAvailableRides(limit = 50) {
  return db
    .select({
      booking: bookings,
      vehicle: {
        id: vehicleCategories.id,
        name: vehicleCategories.name,
        imageUrls: vehicleCategories.imageUrls,
      },
    })
    .from(bookings)
    .innerJoin(vehicleCategories, eq(bookings.vehicleCategoryId, vehicleCategories.id))
    .where(and(eq(bookings.status, "confirmed"), isNull(bookings.driverId)))
    .orderBy(asc(bookings.scheduledAt))
    .limit(limit);
}

/** Every ride a given driver has taken. */
export async function getDriverRides(driverId: string, limit = 100) {
  return db
    .select({
      booking: bookings,
      vehicle: {
        id: vehicleCategories.id,
        name: vehicleCategories.name,
        imageUrls: vehicleCategories.imageUrls,
      },
      client: { name: users.name, phone: users.phone },
    })
    .from(bookings)
    .innerJoin(vehicleCategories, eq(bookings.vehicleCategoryId, vehicleCategories.id))
    .innerJoin(users, eq(bookings.clientId, users.id))
    .where(eq(bookings.driverId, driverId))
    .orderBy(desc(bookings.scheduledAt))
    .limit(limit);
}

/** Every booking a client has made. */
export async function getClientBookings(clientId: string, limit = 100) {
  return db
    .select({
      booking: bookings,
      vehicle: {
        id: vehicleCategories.id,
        name: vehicleCategories.name,
        imageUrls: vehicleCategories.imageUrls,
      },
    })
    .from(bookings)
    .innerJoin(vehicleCategories, eq(bookings.vehicleCategoryId, vehicleCategories.id))
    .where(eq(bookings.clientId, clientId))
    .orderBy(desc(bookings.scheduledAt))
    .limit(limit);
}

export async function getBookingEvents(bookingId: string) {
  return db
    .select({
      event: bookingEvents,
      actor: { name: users.name, email: users.email },
    })
    .from(bookingEvents)
    .leftJoin(users, eq(bookingEvents.actorId, users.id))
    .where(eq(bookingEvents.bookingId, bookingId))
    .orderBy(desc(bookingEvents.createdAt));
}
