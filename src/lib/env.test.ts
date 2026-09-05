import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { env } from "./env";

/**
 * These guard the class of bug that broke a Vercel deployment: a variable
 * that exists but is blank. `"" ?? fallback` is `""`, so a blank value set in
 * a hosting dashboard slips past a nullish check and reaches whatever
 * expected a real value — in that case `new URL("")`, which failed the build.
 */

const KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
  "ADMIN_EMAILS",
  "DEMO_PAYMENTS",
  "STRIPE_SECRET_KEY",
  "MAPBOX_TOKEN",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
] as const;

const original = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

beforeEach(() => {
  for (const key of KEYS) delete process.env[key];
});

afterAll(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("appUrl", () => {
  it("falls back to localhost when nothing is set", () => {
    expect(env.appUrl).toBe("http://localhost:3000");
  });

  it("treats a blank value as unset rather than producing an invalid URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "";
    expect(env.appUrl).toBe("http://localhost:3000");
    expect(() => new URL(env.appUrl)).not.toThrow();
  });

  it("treats a whitespace-only value as unset", () => {
    process.env.NEXT_PUBLIC_APP_URL = "   ";
    expect(env.appUrl).toBe("http://localhost:3000");
  });

  it("uses an explicit URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://vipdrivers.be";
    expect(env.appUrl).toBe("https://vipdrivers.be");
  });

  it("adds the scheme to a bare host, which is what people paste", () => {
    process.env.NEXT_PUBLIC_APP_URL = "vip-drivers.vercel.app";
    expect(env.appUrl).toBe("https://vip-drivers.vercel.app");
  });

  it("strips a trailing slash or path so the origin is never doubled up", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://vipdrivers.be/";
    expect(env.appUrl).toBe("https://vipdrivers.be");

    process.env.NEXT_PUBLIC_APP_URL = "https://vipdrivers.be/booking";
    expect(env.appUrl).toBe("https://vipdrivers.be");
  });

  it("ignores a value that cannot be a URL at all", () => {
    process.env.NEXT_PUBLIC_APP_URL = "not a url";
    expect(() => new URL(env.appUrl)).not.toThrow();
  });

  it("falls back to the URL Vercel assigns, so previews address themselves", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "vip-drivers.vercel.app";
    expect(env.appUrl).toBe("https://vip-drivers.vercel.app");

    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.VERCEL_URL = "vip-drivers-git-branch.vercel.app";
    expect(env.appUrl).toBe("https://vip-drivers-git-branch.vercel.app");
  });

  it("prefers an explicit URL over Vercel's", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://vipdrivers.be";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "vip-drivers.vercel.app";
    expect(env.appUrl).toBe("https://vipdrivers.be");
  });
});

describe("integration flags", () => {
  it("counts a blank credential as not configured", () => {
    process.env.STRIPE_SECRET_KEY = "";
    process.env.MAPBOX_TOKEN = "   ";
    process.env.AUTH_GOOGLE_ID = "";
    process.env.AUTH_GOOGLE_SECRET = "";

    expect(env.stripe.enabled).toBe(false);
    expect(env.mapbox.enabled).toBe(false);
    expect(env.google.enabled).toBe(false);
  });

  it("counts a real credential as configured", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
    expect(env.stripe.enabled).toBe(true);
    expect(env.stripe.isTestMode).toBe(true);

    process.env.STRIPE_SECRET_KEY = "sk_live_abc";
    expect(env.stripe.isTestMode).toBe(false);
  });

  it("requires both halves of an OAuth pair", () => {
    process.env.AUTH_GOOGLE_ID = "id";
    expect(env.google.enabled).toBe(false);
    process.env.AUTH_GOOGLE_SECRET = "secret";
    expect(env.google.enabled).toBe(true);
  });
});

describe("adminEmails", () => {
  it("is empty when unset or blank", () => {
    expect(env.adminEmails).toEqual([]);
    process.env.ADMIN_EMAILS = "  ";
    expect(env.adminEmails).toEqual([]);
  });

  it("lowercases and trims, so the address is matched however it was typed", () => {
    process.env.ADMIN_EMAILS = " Vipdriversbv@Gmail.com , Second@Example.COM ";
    expect(env.adminEmails).toEqual(["vipdriversbv@gmail.com", "second@example.com"]);
  });

  it("drops empty entries from a trailing comma", () => {
    process.env.ADMIN_EMAILS = "a@b.com,,";
    expect(env.adminEmails).toEqual(["a@b.com"]);
  });
});

describe("demo payments flag", () => {
  it("accepts true/false and 1/0, whatever the casing", () => {
    for (const on of ["true", "TRUE", "1"]) {
      process.env.DEMO_PAYMENTS = on;
      expect(env.demoPaymentsEnabled).toBe(true);
    }
    for (const off of ["false", "FALSE", "0"]) {
      process.env.DEMO_PAYMENTS = off;
      expect(env.demoPaymentsEnabled).toBe(false);
    }
  });

  it("ignores a blank value and uses the environment default", () => {
    process.env.DEMO_PAYMENTS = "";
    expect(env.demoPaymentsEnabled).toBe(!env.isProduction);
  });
});
