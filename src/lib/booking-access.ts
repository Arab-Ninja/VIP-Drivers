import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Access tokens for bookings made without an account.
 *
 * The token is keyed by the booking's *reference*, not its database id, and
 * that choice is load-bearing: the reference is in the URL, so a page can
 * check the token and turn an unauthorised visitor away **before** it reads
 * anything from the database. Keying it by id would force a lookup first,
 * and the row would then be serialised into the streamed response even
 * though the page went on to redirect — leaking the client's name, email and
 * itinerary to anyone who guessed a reference.
 *
 * A visitor who books as a guest still has to reach their own confirmation
 * page — to pay, to check the status, to follow the link in their email —
 * without signing in. The token is an HMAC of the booking id keyed by the
 * application secret, so it is unguessable, needs nothing stored, and grants
 * access to exactly one booking.
 *
 * It is a bearer credential: anyone holding the link can see that booking.
 * That is the same trade-off as an order-tracking link, and the booking
 * contains nothing the person who made it does not already know.
 */

const TOKEN_BYTES = 16; // 128 bits of the digest, plenty against guessing

function secret(): string | null {
  return env.authSecret ?? null;
}

export function signBookingToken(reference: string): string | null {
  const key = secret();
  if (!key) return null;
  return createHmac("sha256", key)
    .update(reference.toUpperCase())
    .digest("hex")
    .slice(0, TOKEN_BYTES * 2);
}

export function verifyBookingToken(reference: string, token: string | undefined): boolean {
  if (!token) return false;
  const expected = signBookingToken(reference);
  if (!expected) return false;

  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  // Compare in constant time, and only when the lengths already match:
  // timingSafeEqual throws on a length mismatch.
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The absolute link a guest follows to reach their booking. */
export function bookingUrl(origin: string, reference: string, token: string | null): string {
  const url = new URL(`/booking/${reference}`, origin);
  if (token) url.searchParams.set("t", token);
  return url.toString();
}
