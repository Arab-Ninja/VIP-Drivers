/**
 * Central environment access.
 *
 * The app is designed to boot and be genuinely usable with only DATABASE_URL
 * and AUTH_SECRET set. Every third-party integration reports whether it is
 * configured, and the feature that depends on it degrades to a safe, clearly
 * signposted fallback rather than crashing the request.
 *
 * Two rules make this survive contact with a real hosting dashboard:
 *
 *  - A variable set to an empty or whitespace-only value counts as absent.
 *    Adding a variable in a UI and leaving the box blank is ordinary, and
 *    `??` does not catch it: `"" ?? fallback` is `""`, which then reaches
 *    whatever expected a real value.
 *  - Nothing here throws while a module is being imported. `next build`
 *    imports every route to collect page data, and the build must not depend
 *    on values that only exist at runtime.
 */

/** Trims a value and treats blank as absent. */
function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Normalises a base URL, tolerating the two things people actually paste: a
 * bare host with no scheme, and a trailing path or slash. Returns undefined
 * if the result still is not a URL, so a bad value falls through to the next
 * candidate instead of throwing.
 */
function toOrigin(value: string | undefined): string | undefined {
  const raw = clean(value);
  if (!raw) return undefined;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return undefined;
  }
}

function required(name: string, value: string | undefined): string {
  const resolved = clean(value);
  if (!resolved) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        "Set it in your hosting provider's environment variables (Vercel: " +
        "Settings -> Environment Variables, then redeploy), or locally in " +
        ".env.local — see .env.example.",
    );
  }
  return resolved;
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
    return (
      clean(process.env.AUTH_SECRET) ??
      (isProduction ? undefined : "dev-only-insecure-secret-change-me")
    );
  },

  /**
   * Public origin of this deployment, used for metadata, OAuth callbacks and
   * Stripe return URLs. Falls back to the URL Vercel assigns, so preview
   * deployments address themselves correctly without any configuration.
   */
  get appUrl(): string {
    return (
      toOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
      toOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
      toOrigin(process.env.VERCEL_URL) ??
      "http://localhost:3000"
    );
  },

  google: {
    get clientId() {
      return clean(process.env.AUTH_GOOGLE_ID) ?? "";
    },
    get clientSecret() {
      return clean(process.env.AUTH_GOOGLE_SECRET) ?? "";
    },
    get enabled() {
      return Boolean(clean(process.env.AUTH_GOOGLE_ID) && clean(process.env.AUTH_GOOGLE_SECRET));
    },
  },

  stripe: {
    get secretKey() {
      return clean(process.env.STRIPE_SECRET_KEY) ?? "";
    },
    get webhookSecret() {
      return clean(process.env.STRIPE_WEBHOOK_SECRET) ?? "";
    },
    get publishableKey() {
      return clean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) ?? "";
    },
    get enabled() {
      return Boolean(clean(process.env.STRIPE_SECRET_KEY));
    },
    /** True while the operator is still on Stripe test keys. */
    get isTestMode() {
      return (clean(process.env.STRIPE_SECRET_KEY) ?? "").startsWith("sk_test_");
    },
  },

  paypal: {
    get clientId() {
      return clean(process.env.PAYPAL_CLIENT_ID) ?? "";
    },
    get clientSecret() {
      return clean(process.env.PAYPAL_CLIENT_SECRET) ?? "";
    },
    get enabled() {
      return Boolean(clean(process.env.PAYPAL_CLIENT_ID) && clean(process.env.PAYPAL_CLIENT_SECRET));
    },
  },

  mapbox: {
    /** Server-side token. Never exposed to the browser: all calls are proxied. */
    get token() {
      return clean(process.env.MAPBOX_TOKEN) ?? "";
    },
    get enabled() {
      return Boolean(clean(process.env.MAPBOX_TOKEN));
    },
  },

  push: {
    get publicKey() {
      return clean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) ?? "";
    },
    get privateKey() {
      return clean(process.env.VAPID_PRIVATE_KEY) ?? "";
    },
    get subject() {
      return clean(process.env.VAPID_SUBJECT) ?? "mailto:contact@vipdrivers.be";
    },
    get enabled() {
      return Boolean(
        clean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) && clean(process.env.VAPID_PRIVATE_KEY),
      );
    },
  },

  email: {
    get resendApiKey() {
      return clean(process.env.RESEND_API_KEY) ?? "";
    },
    get from() {
      return clean(process.env.EMAIL_FROM) ?? "VIP Drivers <onboarding@resend.dev>";
    },
    /** Operations inbox that receives booking and contact notifications. */
    get operations() {
      return clean(process.env.OPERATIONS_EMAIL) ?? "";
    },
    get enabled() {
      return Boolean(clean(process.env.RESEND_API_KEY));
    },
  },

  /**
   * Emails promoted to admin on first sign-in, comma separated. This is the
   * only way the very first admin account can come into existence.
   */
  get adminEmails(): string[] {
    return (clean(process.env.ADMIN_EMAILS) ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
  },

  /**
   * Allows a booking to be marked paid without a real payment, so the full
   * flow can be demonstrated before Stripe keys exist. Never on by default in
   * production: it has to be switched on deliberately.
   */
  get demoPaymentsEnabled(): boolean {
    const flag = clean(process.env.DEMO_PAYMENTS)?.toLowerCase();
    if (flag === "true" || flag === "1") return true;
    if (flag === "false" || flag === "0") return false;
    return !isProduction;
  },
} as const;
