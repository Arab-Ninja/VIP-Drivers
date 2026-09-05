/**
 * Central environment access.
 *
 * The app is designed to boot and be genuinely usable with only DATABASE_URL
 * and AUTH_SECRET set. Every third-party integration reports whether it is
 * configured, and the feature that depends on it degrades to a safe, clearly
 * signposted fallback rather than crashing the request.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        "Set it in your hosting provider's environment variables (Vercel: " +
        "Settings -> Environment Variables), or locally in .env.local — see .env.example.",
    );
  }
  return value;
}

const isProduction = process.env.NODE_ENV === "production";

export const env = {
  isProduction,
  nodeEnv: process.env.NODE_ENV ?? "development",

  get databaseUrl(): string {
    return required("DATABASE_URL", process.env.DATABASE_URL);
  },

  /**
   * Deliberately returns undefined rather than throwing when unset in
   * production. This value is read while the Auth.js config is constructed,
   * which happens at module load — and therefore during `next build`, where
   * no runtime secret exists yet. Auth.js raises its own clear error on the
   * first request instead, which fails the request rather than the build.
   *
   * Outside production a stable throwaway keeps `next dev` usable before the
   * operator has generated a real one.
   */
  get authSecret(): string | undefined {
    return process.env.AUTH_SECRET ?? (isProduction ? undefined : "dev-only-insecure-secret-change-me");
  },

  appUrl:
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),

  google: {
    clientId: process.env.AUTH_GOOGLE_ID ?? "",
    clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    get enabled() {
      return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
    },
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
    get enabled() {
      return Boolean(process.env.STRIPE_SECRET_KEY);
    },
    /** True while the operator is still on Stripe test keys. */
    get isTestMode() {
      return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
    },
  },

  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID ?? "",
    clientSecret: process.env.PAYPAL_CLIENT_SECRET ?? "",
    get enabled() {
      return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
    },
  },

  mapbox: {
    /** Server-side token. Never exposed to the browser: all calls are proxied. */
    token: process.env.MAPBOX_TOKEN ?? "",
    get enabled() {
      return Boolean(process.env.MAPBOX_TOKEN);
    },
  },

  push: {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
    privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
    subject: process.env.VAPID_SUBJECT ?? "mailto:contact@vipdrivers.be",
    get enabled() {
      return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
    },
  },

  email: {
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    from: process.env.EMAIL_FROM ?? "VIP Drivers <onboarding@resend.dev>",
    /** Operations inbox that receives booking and contact notifications. */
    operations: process.env.OPERATIONS_EMAIL ?? "",
    get enabled() {
      return Boolean(process.env.RESEND_API_KEY);
    },
  },

  /**
   * Emails promoted to admin on first sign-in, comma separated. This is the
   * only way the very first admin account can come into existence.
   */
  adminEmails: (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),

  /**
   * Allows a booking to be marked paid without a real payment, so the full
   * flow can be demonstrated before Stripe keys exist. Never on by default in
   * production: it has to be switched on deliberately.
   */
  get demoPaymentsEnabled(): boolean {
    if (process.env.DEMO_PAYMENTS === "true") return true;
    if (process.env.DEMO_PAYMENTS === "false") return false;
    return !isProduction;
  },
} as const;
