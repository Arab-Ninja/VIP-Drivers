"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { bookings, bookingEvents, vehicleCategories } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { verifyBookingToken, signBookingToken } from "@/lib/booking-access";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { env } from "@/lib/env";
import { getRequestOrigin } from "@/lib/request-origin";
import { markBookingPaid } from "@/server/bookings";
import { syncBookingPaymentById, syncPendingPayments } from "@/server/payments";

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
export async function startCheckout(
  bookingId: string,
  accessToken?: string | null,
): Promise<CheckoutResult> {
  const user = await getCurrentUser();

  const [row] = await db
    .select({ booking: bookings, vehicle: vehicleCategories })
    .from(bookings)
    .innerJoin(vehicleCategories, eq(bookings.vehicleCategoryId, vehicleCategories.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!row) return { ok: false, error: "not_found" };

  const { booking, vehicle } = row;

  // A guest pays through the signed link they were given; no account needed.
  const viaToken = verifyBookingToken(booking.reference, accessToken ?? undefined);
  const isOwner = Boolean(user) && booking.clientId === user!.id;
  if (!viaToken && !isOwner && user?.role !== "admin") return { ok: false, error: "forbidden" };

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
    const origin = await getRequestOrigin();
    const returnToken = viaToken
      ? `&t=${encodeURIComponent(signBookingToken(booking.reference) ?? "")}`
      : "";
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
      // Built from the origin the client is actually on, not a configured
      // one: coming back to a different hostname would lose their session.
      success_url: `${origin}/booking/${booking.reference}?paid=1${returnToken}`,
      cancel_url: `${origin}/booking/${booking.reference}?cancelled=1${returnToken}`,
      locale: "fr",
    });

    if (!session.url) return { ok: false, error: "stripe_no_url" };

    await db
      .update(bookings)
      .set({ stripeSessionId: session.id, paymentStatus: "processing", updatedAt: new Date() })
      .where(eq(bookings.id, booking.id));

    await db.insert(bookingEvents).values({
      bookingId: booking.id,
      actorId: user?.id ?? null,
      type: "checkout_started",
      message: `Stripe Checkout session ${session.id}`,
    });

    return { ok: true, kind: "redirect", url: session.url };
  } catch (error) {
    console.error("[startCheckout] failed", error);
    return { ok: false, error: "stripe_error" };
  }
}


export type VerifyResult =
  | { ok: true; paid: boolean }
  | { ok: false; error: string };

/**
 * Asks Stripe whether this booking's payment actually went through.
 *
 * Gives a client — or an operator on their behalf — a way out when the
 * webhook did not arrive, without anyone having to touch the database.
 */
export async function verifyPayment(
  bookingId: string,
  accessToken?: string | null,
): Promise<VerifyResult> {
  const user = await getCurrentUser();

  const [booking] = await db
    .select({ id: bookings.id, clientId: bookings.clientId, reference: bookings.reference })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) return { ok: false, error: "not_found" };

  const viaToken = verifyBookingToken(booking.reference, accessToken ?? undefined);
  const owns = Boolean(user) && booking.clientId === user!.id;
  if (!viaToken && !owns && user?.role !== "admin") {
    return { ok: false, error: "forbidden" };
  }

  const result = await syncBookingPaymentById(bookingId);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/account");
  revalidatePath("/admin/bookings");
  return { ok: true, paid: result.paid };
}

/** Re-checks every booking stuck mid-payment. Admin only. */
export async function verifyAllPendingPayments(): Promise<
  { ok: true; checked: number; confirmed: number } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { ok: false, error: "forbidden" };

  const result = await syncPendingPayments();
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  return { ok: true, ...result };
}
