import Stripe from "stripe";
import { env } from "@/lib/env";

/**
 * Stripe client, created lazily so the app boots with no keys configured.
 * Card, Apple Pay and Google Pay all arrive through Checkout: the wallets
 * appear automatically on supporting devices once the domain is verified in
 * the Stripe dashboard, with no extra code here.
 */
let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!env.stripe.enabled) {
    throw new Error("Stripe is not configured: set STRIPE_SECRET_KEY.");
  }
  if (!client) {
    client = new Stripe(env.stripe.secretKey, {
      typescript: true,
      appInfo: { name: "VIP Drivers", version: "2.0.0" },
    });
  }
  return client;
}

export function isStripeConfigured(): boolean {
  return env.stripe.enabled;
}
