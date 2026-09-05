import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { bookings, bookingEvents } from "@/db/schema";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { markBookingPaid } from "@/server/bookings";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook.
 *
 * This — not the browser returning to the success page — is what confirms a
 * booking. A client who pays and immediately closes the tab is still recorded
 * correctly, and a client who forges a visit to `?paid=1` changes nothing.
 *
 * The raw request body is required for signature verification, so it is read
 * as text before any JSON parsing.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured() || !env.stripe.webhookSecret) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, env.stripe.webhookSecret);
  } catch (error) {
    console.error("[stripe:webhook] signature verification failed", error);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.payment_status !== "paid") break;

        const bookingId = session.metadata?.bookingId;
        if (!bookingId) {
          console.error("[stripe:webhook] session without bookingId", session.id);
          break;
        }

        await markBookingPaid(bookingId, {
          provider: "stripe",
          paymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : (session.payment_intent?.id ?? undefined),
        });
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object;
        const bookingId = session.metadata?.bookingId;
        if (!bookingId) break;

        // Put the booking back where the client can retry payment.
        await db
          .update(bookings)
          .set({ paymentStatus: "unpaid", stripeSessionId: null, updatedAt: new Date() })
          .where(eq(bookings.id, bookingId));

        await db.insert(bookingEvents).values({
          bookingId,
          type: "checkout_expired",
          message: "Stripe Checkout session expired",
        });
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const intentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (!intentId) break;

        const [booking] = await db
          .select({ id: bookings.id })
          .from(bookings)
          .where(eq(bookings.stripePaymentIntentId, intentId))
          .limit(1);
        if (!booking) break;

        await db
          .update(bookings)
          .set({ paymentStatus: "refunded", updatedAt: new Date() })
          .where(eq(bookings.id, booking.id));

        await db.insert(bookingEvents).values({
          bookingId: booking.id,
          type: "refunded",
          message: `Refunded ${(charge.amount_refunded / 100).toFixed(2)} EUR`,
        });
        break;
      }

      default:
        // Everything else is acknowledged and ignored, so Stripe stops
        // retrying events this application has no interest in.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // A 500 makes Stripe retry, which is what we want for a transient
    // database failure.
    console.error("[stripe:webhook] handler failed", event.type, error);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }
}
