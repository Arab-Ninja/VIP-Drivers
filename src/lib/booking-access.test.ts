import { describe, it, expect } from "vitest";
import { signBookingToken, verifyBookingToken, bookingUrl } from "./booking-access";

/**
 * These tokens are the only thing standing between a guest's booking and the
 * open internet, so the guarantees are worth pinning down.
 */

const A = "VIP-AAA111";
const B = "VIP-BBB222";

describe("booking access tokens", () => {
  it("accepts the token it issued", () => {
    const token = signBookingToken(A);
    expect(token).toBeTruthy();
    expect(verifyBookingToken(A, token!)).toBe(true);
  });

  it("is stable, so a link in an email keeps working", () => {
    expect(signBookingToken(A)).toBe(signBookingToken(A));
  });

  it("does not open a different booking", () => {
    const token = signBookingToken(A)!;
    expect(verifyBookingToken(B, token)).toBe(false);
  });

  it("gives each booking a different token", () => {
    expect(signBookingToken(A)).not.toBe(signBookingToken(B));
  });

  it("rejects a missing, empty or malformed token", () => {
    expect(verifyBookingToken(A, undefined)).toBe(false);
    expect(verifyBookingToken(A, "")).toBe(false);
    expect(verifyBookingToken(A, "not-a-token")).toBe(false);
  });

  it("rejects a token of the right length but the wrong value", () => {
    const token = signBookingToken(A)!;
    const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
    expect(tampered).toHaveLength(token.length);
    expect(verifyBookingToken(A, tampered)).toBe(false);
  });

  it("is case-insensitive on the reference, as URLs are typed by hand", () => {
    const token = signBookingToken(A)!;
    expect(verifyBookingToken(A.toLowerCase(), token)).toBe(true);
  });

  it("reveals nothing about the reference", () => {
    const token = signBookingToken(A)!;
    expect(token).not.toContain(A);
    expect(token).toMatch(/^[0-9a-f]+$/);
    expect(token.length).toBeGreaterThanOrEqual(32);
  });

  it("builds a link carrying the token, and one without", () => {
    const token = signBookingToken(A)!;
    const withToken = new URL(bookingUrl("https://vipdrivers.be", "VIP-ABC123", token));
    expect(withToken.pathname).toBe("/booking/VIP-ABC123");
    expect(withToken.searchParams.get("t")).toBe(token);

    const withoutToken = new URL(bookingUrl("https://vipdrivers.be", "VIP-ABC123", null));
    expect(withoutToken.searchParams.has("t")).toBe(false);
  });
});
