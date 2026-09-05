"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { bookings, bookingEvents, vehicleCategories } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { env } from "@/lib/env";
import { markBookingPaid } from "@/server/bookings";

export type CheckoutResult =
  | { ok: true; kind: "redirect"; url: string }
  | { ok: true; kind: "demo" }
  | { ok: false; error: string };

/**
 * Starts payment for a pending booking.
 *
 * With Stripe configured this creates a Checkout Session (card, Apple Pay and
 * Google Pay) and hands back its URL. The booking is only marked paid by the
 * webhook, never by the browser coming back to the success page, so a client
 * who closes the tab mid-payment still ends up correctly recorded.
 *
 * Without Stripe, and only where demo payments are switched on, the booking is
 * confirmed directly so the whole flow can be exercised before keys exist.
 */
export async function startCheckout(bookingId: string): Promise<CheckoutResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const [row] = await db
    .select({ booking: bookings, vehicle: vehicleCategories })
    .from(bookings)
    .innerJoin(vehicleCategories, eq(bookings.vehicleCategoryId, vehicleCategories.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!row) return { ok: false, error: "not_found" };

  const { booking, vehicle } = row;
  const isOwner = booking.clientId === user.id;
  if (!isOwner && user.role !== "admin") return { ok: false, error: "forbidden" };

  if (booking.paymentStatus === "paid") return { ok: false, error: "already_paid" };
  if (booking.status === "cancelled") return { ok: false, error: "cancelled" };

  if (!isStripeConfigured()) {
    if (!env.demoPaymentsEnabled) return { ok: false, error: "payments_unavailable" };

    await markBookingPaid(booking.id, { provider: "demo" });
    revalidatePath(`/booking/${booking.reference}`);
    revalidatePath("/account");
    return { ok: true, kind: "demo" };
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Card covers Apple Pay and Google Pay: Stripe surfaces the wallet
      // automatically on devices that support it.
      payment_method_types: ["card"],
      client_reference_id: booking.reference,
      customer_email: booking.contactEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: booking.priceTtcCents,
            product_data: {
              name: `${vehicle.name} — ${
                booking.serviceType === "transfer" ? "Transfert" : "Mise à disposition"
              }`,
              description: `${booking.reference} · ${booking.pickupAddress} → ${booking.dropoffAddress}`,
            },
          },
        },
      ],
      metadata: {
        bookingId: booking.id,
        reference: booking.reference,
      },
      success_url: `${env.appUrl}/booking/${booking.reference}?paid=1`,
      cancel_url: `${env.appUrl}/booking/${booking.reference}?cancelled=1`,
      locale: "fr",
    });

    if (!session.url) return { ok: false, error: "stripe_no_url" };

    await db
      .update(bookings)
      .set({ stripeSessionId: session.id, paymentStatus: "processing", updatedAt: new Date() })
      .where(eq(bookings.id, booking.id));

    await db.insert(bookingEvents).values({
      bookingId: booking.id,
      actorId: user.id,
      type: "checkout_started",
      message: `Stripe Checkout session ${session.id}`,
    });

    return { ok: true, kind: "redirect", url: session.url };
  } catch (error) {
    console.error("[startCheckout] failed", error);
    return { ok: false, error: "stripe_error" };
  }
}
