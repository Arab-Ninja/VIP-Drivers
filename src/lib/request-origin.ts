import "server-only";
import { headers } from "next/headers";
import { env } from "@/lib/env";

/**
 * The origin the visitor is actually browsing.
 *
 * Redirect targets must be built from this rather than from a configured URL.
 * A deployment answers on several hostnames — the production domain, the
 * project's .vercel.app alias, a preview URL, apex versus www — and a session
 * cookie belongs to exactly one of them. Sending a client to a *different*
 * one on the way back from Stripe logs them out: they return to a page that
 * cannot see their session, so it redirects them to sign in and the booking
 * they just paid for still reads "awaiting payment".
 *
 * Falls back to the configured URL when there are no headers to read.
 */
export async function getRequestOrigin(): Promise<string> {
  try {
    const list = await headers();

    // Vercel and most proxies set these; behind several hops the header is a
    // comma-separated list and the first entry is the original client's.
    const forwardedHost = list.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || list.get("host")?.split(",")[0]?.trim();
    if (!host) return env.appUrl;

    const forwardedProto = list.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const protocol =
      forwardedProto || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return env.appUrl;
  }
}
