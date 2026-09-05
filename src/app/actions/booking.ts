"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { bookings, bookingEvents } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { buildQuote, quoteRequestSchema } from "@/server/quote";
import { generateReference, formatDateTime } from "@/lib/utils";
import { formatCents } from "@/lib/pricing";
import { sendEmail, sendOperationsEmail } from "@/lib/email";
import { notifyUser } from "@/server/notify";

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
  | { ok: true; reference: string; id: string }
  | { ok: false; error: string };

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
  if (!user) return { ok: false, error: "unauthenticated" };
  if (user.blocked) return { ok: false, error: "blocked" };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };
  }

  const data = parsed.data;
  const result = await buildQuote(data);
  if (!result.ok) return { ok: false, error: result.error };

  const { quote, route, vehicle, scheduledAt } = result.data;

  try {
    const [row] = await db
      .insert(bookings)
      .values({
        reference: generateReference(),
        clientId: user.id,
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
      actorId: user.id,
      type: "created",
      message: `Booking created (${data.serviceType})`,
      metadata: { provider: route.provider, estimated: route.estimated },
    });

    const when = formatDateTime(scheduledAt, "fr-BE");
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
        "VIP Drivers",
      ],
    }).catch(() => {});

    revalidatePath("/account");
    return { ok: true, reference: row.reference, id: row.id };
  } catch (error) {
    console.error("[createBooking] failed", error);
    return { ok: false, error: "server" };
  }
}

/* ------------------------------------------------------------------ */
/* Client-side cancellation                                            */
/* ------------------------------------------------------------------ */

export async function cancelOwnBooking(bookingId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const [booking] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.clientId, user.id)))
    .limit(1);

  if (!booking) return { ok: false, error: "not_found" };
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
    actorId: user.id,
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

  await sendOperationsEmail({
    subject: `Réservation annulée ${booking.reference}`,
    lines: [`La réservation ${booking.reference} a été annulée par le client.`],
  }).catch(() => {});

  revalidatePath("/account");
  revalidatePath("/admin/bookings");
  return { ok: true };
}
