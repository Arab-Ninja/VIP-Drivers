import "server-only";
import { and, eq, inArray, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { bookings, type Booking } from "@/db/schema";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { markBookingPaid } from "@/server/bookings";

/**
 * Reconciles a booking against Stripe.
 *
 * The webhook remains the primary path — it is the only one that works when
 * the client closes the tab mid-payment. But a webhook is a single point of
 * failure that is easy to misconfigure (no signing secret, no endpoint, or an
 * endpoint created in test mode while the keys are live), and when it fails
 * silently a client who has genuinely paid is left staring at "pending".
 *
 * So the return from Checkout also asks Stripe directly. This trusts nothing
 * from the browser: the session id comes from our own row, and the answer
 * comes from Stripe's API. `?paid=1` in a URL proves nothing and is not used
 * as evidence — it only prompts the check.
 */

export type PaymentSyncResult =
  | { ok: true; paid: boolean; changed: boolean }
  | { ok: false; error: "not_configured" | "no_session" | "stripe_error" };

export async function syncBookingPayment(booking: Booking): Promise<PaymentSyncResult> {
  if (booking.paymentStatus === "paid") {
    return { ok: true, paid: true, changed: false };
  }
  if (!isStripeConfigured()) return { ok: false, error: "not_configured" };
  if (!booking.stripeSessionId) return { ok: false, error: "no_session" };

  try {
    const session = await getStripe().checkout.sessions.retrieve(booking.stripeSessionId);

    if (session.payment_status !== "paid") {
      return { ok: true, paid: false, changed: false };
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? undefined);

    // markBookingPaid is idempotent, so racing the webhook is harmless: one
    // of the two wins and the other reports no change.
    const changed = await markBookingPaid(booking.id, {
      provider: "stripe (verified on return)",
      paymentIntentId,
    });

    return { ok: true, paid: true, changed };
  } catch (error) {
    console.error("[payments] could not verify session", booking.reference, error);
    return { ok: false, error: "stripe_error" };
  }
}

export async function syncBookingPaymentById(bookingId: string): Promise<PaymentSyncResult> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) return { ok: false, error: "no_session" };
  return syncBookingPayment(booking);
}

/**
 * Re-checks every booking that started a payment but never completed one.
 * Gives an operator a single button to recover from a webhook that was down,
 * rather than opening each booking in turn.
 */
export async function syncPendingPayments(
  limit = 100,
): Promise<{ checked: number; confirmed: number }> {
  if (!isStripeConfigured()) return { checked: 0, confirmed: 0 };

  const candidates = await db
    .select()
    .from(bookings)
    .where(
      and(
        inArray(bookings.paymentStatus, ["processing", "unpaid"]),
        inArray(bookings.status, ["pending"]),
        isNotNull(bookings.stripeSessionId),
      ),
    )
    .limit(limit);

  let confirmed = 0;
  for (const booking of candidates) {
    const result = await syncBookingPayment(booking);
    if (result.ok && result.changed) confirmed += 1;
  }

  return { checked: candidates.length, confirmed };
}
