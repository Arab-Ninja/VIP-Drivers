"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { bookings, bookingEvents, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { buildQuote, quoteRequestSchema } from "@/server/quote";
import { generateReference, formatDateTime } from "@/lib/utils";
import { formatCents } from "@/lib/pricing";
import { sendEmail, sendOperationsEmail } from "@/lib/email";
import { notifyUser, notifyAdmins } from "@/server/notify";
import { signBookingToken, bookingUrl, verifyBookingToken } from "@/lib/booking-access";
import { getRequestOrigin } from "@/lib/request-origin";

const createSchema = quoteRequestSchema.and(
  z.object({
    passengers: z.number().int().min(1).max(8),
    luggage: z.number().int().min(0).max(12),
    flightNumber: z.string().trim().max(20).optional(),
    notes: z.string().trim().max(2000).optional(),
    contactName: z.string().trim().min(2).max(120),
    contactEmail: z.string().trim().email().max(200),
    contactPhone: z.string().trim().min(6).max(40),
  }),
);

export type CreateBookingResult =
  | { ok: true; reference: string; id: string; accessToken: string | null }
  | { ok: false; error: string };

/**
 * Resolves the account a booking belongs to.
 *
 * A visitor does not need an account to book — requiring one loses the sale.
 * Their email becomes the identity instead: the booking is attached to a user
 * row keyed by that address, created without a password so it cannot be
 * signed into directly. When that person later signs in with Google using the
 * same address, Auth.js links to this very row, and every booking they made
 * as a guest is already in their history.
 */
async function resolveClient(
  signedInUserId: string | null,
  contactEmail: string,
  contactName: string,
  contactPhone: string,
): Promise<{ id: string; isGuest: boolean }> {
  if (signedInUserId) return { id: signedInUserId, isGuest: false };

  const email = contactEmail.toLowerCase().trim();
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existing) {
    // Fill in details we did not have before, without touching anything the
    // account holder has since set themselves.
    if (!existing.name || !existing.phone) {
      await db
        .update(users)
        .set({
          name: existing.name ?? contactName,
          phone: existing.phone ?? contactPhone,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id));
    }
    return { id: existing.id, isGuest: true };
  }

  const [created] = await db
    .insert(users)
    .values({ email, name: contactName, phone: contactPhone, role: "client" })
    .returning();

  return { id: created.id, isGuest: true };
}

/**
 * Creates a booking in the `pending` state.
 *
 * The price is recomputed here from the itinerary rather than accepted from
 * the client, so the amount stored — and later charged — is always the
 * server's own. The quote is frozen onto the row so the invoice can be
 * explained later even if the operator changes their rates tomorrow.
 */
export async function createBooking(input: unknown): Promise<CreateBookingResult> {
  const user = await getCurrentUser();
  if (user?.blocked) return { ok: false, error: "blocked" };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };
  }

  const data = parsed.data;
  const result = await buildQuote(data);
  if (!result.ok) return { ok: false, error: result.error };

  const { quote, route, vehicle, scheduledAt } = result.data;

  const client = await resolveClient(
    user?.id ?? null,
    data.contactEmail,
    data.contactName,
    data.contactPhone,
  );

  try {
    const [row] = await db
      .insert(bookings)
      .values({
        reference: generateReference(),
        clientId: client.id,
        vehicleCategoryId: vehicle.id,
        serviceType: data.serviceType,
        status: "pending",
        paymentStatus: "unpaid",

        pickupAddress: data.pickup.address,
        pickupLat: data.pickup.lat,
        pickupLng: data.pickup.lng,
        dropoffAddress: data.dropoff.address,
        dropoffLat: data.dropoff.lat,
        dropoffLng: data.dropoff.lng,
        stops: data.serviceType === "transfer" ? data.stops : [],

        scheduledAt,
        durationHours: data.serviceType === "disposal" ? (data.durationHours ?? null) : null,
        distanceMeters: route.distanceMeters,
        routeDurationSeconds: route.durationSeconds,

        passengers: data.passengers,
        luggage: data.luggage,
        flightNumber: data.flightNumber || null,
        notes: data.notes || null,

        contactName: data.contactName,
        contactEmail: data.contactEmail.toLowerCase(),
        contactPhone: data.contactPhone,

        priceHtvaCents: quote.htvaCents,
        vatBps: quote.vatBps,
        vatCents: quote.vatCents,
        priceTtcCents: quote.ttcCents,
        priceBreakdown: {
          ...quote,
          routeProvider: route.provider,
          routeEstimated: route.estimated,
          rates: {
            pricePerKmCents: vehicle.pricePerKmCents,
            pricePerHourCents: vehicle.pricePerHourCents,
            minimumPriceCents: vehicle.minimumPriceCents,
          },
        } as unknown as Record<string, unknown>,
      })
      .returning();

    await db.insert(bookingEvents).values({
      bookingId: row.id,
      actorId: user?.id ?? null,
      type: "created",
      message: `Booking created (${data.serviceType})`,
      metadata: { provider: route.provider, estimated: route.estimated },
    });

    const when = formatDateTime(scheduledAt, "fr-BE");
    const accessToken = signBookingToken(row.reference);
    const origin = await getRequestOrigin();
    const link = bookingUrl(origin, row.reference, client.isGuest ? accessToken : null);

    // The operator has to hear about a booking the moment it exists, not only
    // once it is paid: a pending booking is a client waiting on them.
    await notifyAdmins({
      title: "Nouvelle réservation",
      body: `${row.reference} — ${data.contactName} — ${formatCents(quote.ttcCents)} — ${when}`,
      url: `/admin/bookings/${row.id}`,
    }).catch(() => {});

    await sendOperationsEmail({
      subject: `Nouvelle réservation ${row.reference} — ${formatCents(quote.ttcCents)}`,
      lines: [
        `Référence : ${row.reference}`,
        `Service : ${data.serviceType === "transfer" ? "Transfert" : "Mise à disposition"}`,
        `Véhicule : ${vehicle.name}`,
        `Prise en charge : ${when}`,
        `Départ : ${data.pickup.address}`,
        `Arrivée : ${data.dropoff.address}`,
        `Client : ${data.contactName} — ${data.contactPhone} — ${data.contactEmail}`,
        `Montant : ${formatCents(quote.ttcCents)} TVAC`,
        "",
        "Statut : en attente de paiement.",
      ],
    }).catch(() => {});

    await sendEmail({
      to: data.contactEmail,
      subject: `VIP Drivers — réservation ${row.reference}`,
      lines: [
        `Bonjour ${data.contactName},`,
        "",
        `Votre réservation ${row.reference} a bien été enregistrée.`,
        `Prise en charge : ${when}`,
        `Départ : ${data.pickup.address}`,
        `Arrivée : ${data.dropoff.address}`,
        `Véhicule : ${vehicle.name}`,
        `Montant : ${formatCents(quote.ttcCents)} TVAC`,
        "",
        "Elle sera confirmée dès réception du paiement.",
        "",
        `Suivre et payer votre réservation : ${link}`,
        "",
        "VIP Drivers",
      ],
    }).catch(() => {});

    revalidatePath("/account");
    revalidatePath("/admin/bookings");
    // A guest gets a token so they can reach the booking they just made
    // without an account; a signed-in client does not need one.
    return {
      ok: true,
      reference: row.reference,
      id: row.id,
      accessToken: client.isGuest ? accessToken : null,
    };
  } catch (error) {
    console.error("[createBooking] failed", error);
    return { ok: false, error: "server" };
  }
}

/* ------------------------------------------------------------------ */
/* Client-side cancellation                                            */
/* ------------------------------------------------------------------ */

export async function cancelOwnBooking(
  bookingId: string,
  accessToken?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();

  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) return { ok: false, error: "not_found" };

  // Nothing is rendered from an action, so loading the booking to check its
  // reference against the token leaks nothing.
  const viaToken = verifyBookingToken(booking.reference, accessToken ?? undefined);
  const owns = Boolean(user) && booking.clientId === user!.id;
  if (!viaToken && !owns && user?.role !== "admin") return { ok: false, error: "forbidden" };
  if (booking.status === "completed" || booking.status === "cancelled") {
    return { ok: false, error: "not_cancellable" };
  }

  await db
    .update(bookings)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      cancellationReason: "Annulée par le client",
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, bookingId));

  await db.insert(bookingEvents).values({
    bookingId,
    actorId: user?.id ?? null,
    type: "cancelled",
    message: "Cancelled by the client",
  });

  // A driver who had taken this ride needs to know it is off.
  if (booking.driverId) {
    await notifyUser(booking.driverId, {
      title: "Trajet annulé",
      body: `La réservation ${booking.reference} a été annulée par le client.`,
      url: "/driver/rides",
    }).catch(() => {});
  }

  await notifyAdmins({
    title: "Réservation annulée",
    body: `${booking.reference} a été annulée par le client.`,
    url: `/admin/bookings/${booking.id}`,
  }).catch(() => {});

  await sendOperationsEmail({
    subject: `Réservation annulée ${booking.reference}`,
    lines: [`La réservation ${booking.reference} a été annulée par le client.`],
  }).catch(() => {});

  revalidatePath("/account");
  revalidatePath("/admin/bookings");
  return { ok: true };
}
