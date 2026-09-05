import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { eq, inArray } from "drizzle-orm";

import { db, sql } from "@/db";
import {
  bookings,
  bookingEvents,
  driverProfiles,
  notifications,
  users,
  vehicleCategories,
} from "@/db/schema";
import { claimBooking, completeBooking, markBookingPaid } from "@/server/bookings";
import { generateReference } from "@/lib/utils";

/**
 * Integration tests against a real Postgres, because the guarantee under test
 * — that two drivers can never both hold the same ride — lives in a SQL WHERE
 * clause, not in TypeScript. Mocking the database would test nothing.
 *
 * Requires DATABASE_URL to point at a database with the schema applied.
 */

const suffix = Math.random().toString(36).slice(2, 8);
const ids = {
  client: `test-client-${suffix}`,
  driverA: `test-driver-a-${suffix}`,
  driverB: `test-driver-b-${suffix}`,
  vehicle: `test-vehicle-${suffix}`,
};

let bookingIds: string[] = [];

async function createBooking(overrides: Partial<typeof bookings.$inferInsert> = {}) {
  const [row] = await db
    .insert(bookings)
    .values({
      reference: generateReference(),
      clientId: ids.client,
      vehicleCategoryId: ids.vehicle,
      serviceType: "transfer",
      status: "confirmed",
      paymentStatus: "paid",
      pickupAddress: "Avenue Louise 143, Bruxelles",
      pickupLat: 50.8286,
      pickupLng: 4.3641,
      dropoffAddress: "Brussels Airport",
      dropoffLat: 50.9014,
      dropoffLng: 4.4844,
      scheduledAt: new Date(Date.now() + 86_400_000),
      distanceMeters: 15_000,
      routeDurationSeconds: 1_200,
      contactName: "Test Client",
      contactEmail: "test@example.com",
      contactPhone: "+32 470 00 00 00",
      priceHtvaCents: 10_000,
      vatBps: 600,
      vatCents: 600,
      priceTtcCents: 10_600,
      ...overrides,
    })
    .returning();
  bookingIds.push(row.id);
  return row;
}

beforeAll(async () => {
  await db.insert(users).values([
    { id: ids.client, name: "Test Client", email: `client-${suffix}@test.local`, role: "client" },
    { id: ids.driverA, name: "Driver A", email: `driver-a-${suffix}@test.local`, role: "driver" },
    { id: ids.driverB, name: "Driver B", email: `driver-b-${suffix}@test.local`, role: "driver" },
  ]);

  await db.insert(driverProfiles).values([
    {
      userId: ids.driverA,
      companyName: "Driver A SRL",
      status: "approved",
      commissionBps: 2000,
    },
    {
      userId: ids.driverB,
      companyName: "Driver B SRL",
      status: "approved",
      commissionBps: 1500,
    },
  ]);

  await db.insert(vehicleCategories).values({
    id: ids.vehicle,
    slug: `test-vehicle-${suffix}`,
    name: "Test Vehicle",
    pricePerKmCents: 300,
    pricePerHourCents: 8000,
    minimumPriceCents: 8000,
    isActive: false,
  });
});

afterAll(async () => {
  if (bookingIds.length) {
    await db.delete(bookingEvents).where(inArray(bookingEvents.bookingId, bookingIds));
    await db.delete(bookings).where(inArray(bookings.id, bookingIds));
  }
  await db.delete(notifications).where(inArray(notifications.userId, Object.values(ids)));
  await db.delete(driverProfiles).where(inArray(driverProfiles.userId, [ids.driverA, ids.driverB]));
  await db.delete(users).where(inArray(users.id, [ids.client, ids.driverA, ids.driverB]));
  await db.delete(vehicleCategories).where(eq(vehicleCategories.id, ids.vehicle));
  await sql.end();
});

beforeEach(() => {
  bookingIds = bookingIds.slice();
});

describe("claiming a ride", () => {
  it("assigns the ride and computes the driver's cut", async () => {
    const booking = await createBooking();

    const result = await claimBooking(booking.id, ids.driverA);
    expect(result).toEqual({ ok: true });

    const [after] = await db.select().from(bookings).where(eq(bookings.id, booking.id));
    expect(after.driverId).toBe(ids.driverA);
    expect(after.claimedAt).toBeInstanceOf(Date);
    expect(after.commissionBps).toBe(2000);
    expect(after.commissionCents).toBe(2_000); // 20% of 100.00 EUR HTVA
    expect(after.driverEarningsCents).toBe(8_000);
  });

  it("gives the ride to exactly one of two drivers racing for it", async () => {
    const booking = await createBooking();

    // Both requests are issued before either resolves, which is what two
    // drivers tapping "take this ride" at the same moment looks like.
    const [a, b] = await Promise.all([
      claimBooking(booking.id, ids.driverA),
      claimBooking(booking.id, ids.driverB),
    ]);

    const winners = [a, b].filter((r) => r.ok);
    const losers = [a, b].filter((r) => !r.ok);
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect(losers[0]).toEqual({ ok: false, error: "taken" });

    const [after] = await db.select().from(bookings).where(eq(bookings.id, booking.id));
    expect([ids.driverA, ids.driverB]).toContain(after.driverId);
  });

  it("holds under a wider stampede", async () => {
    const booking = await createBooking();

    const attempts = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        claimBooking(booking.id, i % 2 === 0 ? ids.driverA : ids.driverB),
      ),
    );

    expect(attempts.filter((r) => r.ok)).toHaveLength(1);
    expect(attempts.filter((r) => !r.ok && r.error === "taken")).toHaveLength(7);
  });

  it("refuses a ride that is already taken", async () => {
    const booking = await createBooking();
    await claimBooking(booking.id, ids.driverA);

    expect(await claimBooking(booking.id, ids.driverB)).toEqual({ ok: false, error: "taken" });
  });

  it("refuses a booking that is not yet paid for", async () => {
    const booking = await createBooking({ status: "pending", paymentStatus: "unpaid" });

    expect(await claimBooking(booking.id, ids.driverA)).toEqual({
      ok: false,
      error: "not_claimable",
    });
  });

  it("refuses a driver who is not approved", async () => {
    const booking = await createBooking();
    await db
      .update(driverProfiles)
      .set({ status: "pending" })
      .where(eq(driverProfiles.userId, ids.driverB));

    expect(await claimBooking(booking.id, ids.driverB)).toEqual({
      ok: false,
      error: "not_approved",
    });

    await db
      .update(driverProfiles)
      .set({ status: "approved" })
      .where(eq(driverProfiles.userId, ids.driverB));
  });

  it("uses each driver's own commission rate", async () => {
    const booking = await createBooking();
    await claimBooking(booking.id, ids.driverB); // 15%

    const [after] = await db.select().from(bookings).where(eq(bookings.id, booking.id));
    expect(after.commissionCents).toBe(1_500);
    expect(after.driverEarningsCents).toBe(8_500);
  });
});

describe("completing a ride", () => {
  it("lets the assigned driver complete it", async () => {
    const booking = await createBooking();
    await claimBooking(booking.id, ids.driverA);

    expect(await completeBooking(booking.id, ids.driverA)).toEqual({ ok: true });

    const [after] = await db.select().from(bookings).where(eq(bookings.id, booking.id));
    expect(after.status).toBe("completed");
    expect(after.completedAt).toBeInstanceOf(Date);
  });

  it("refuses a driver the ride is not assigned to", async () => {
    const booking = await createBooking();
    await claimBooking(booking.id, ids.driverA);

    const result = await completeBooking(booking.id, ids.driverB);
    expect(result.ok).toBe(false);

    const [after] = await db.select().from(bookings).where(eq(bookings.id, booking.id));
    expect(after.status).toBe("confirmed");
  });

  it("lets an admin complete any ride", async () => {
    const booking = await createBooking();
    await claimBooking(booking.id, ids.driverA);

    expect(await completeBooking(booking.id, ids.client, { asAdmin: true })).toEqual({ ok: true });
  });
});

describe("marking a booking paid", () => {
  it("moves it from pending to confirmed exactly once", async () => {
    const booking = await createBooking({ status: "pending", paymentStatus: "unpaid" });

    expect(await markBookingPaid(booking.id, { provider: "test" })).toBe(true);

    const [after] = await db.select().from(bookings).where(eq(bookings.id, booking.id));
    expect(after.status).toBe("confirmed");
    expect(after.paymentStatus).toBe("paid");
    expect(after.paidAt).toBeInstanceOf(Date);

    // Stripe retries webhooks; a second delivery must change nothing and must
    // not re-notify every driver.
    expect(await markBookingPaid(booking.id, { provider: "test" })).toBe(false);
  });

  it("is safe against concurrent webhook deliveries", async () => {
    const booking = await createBooking({ status: "pending", paymentStatus: "unpaid" });

    const results = await Promise.all([
      markBookingPaid(booking.id, { provider: "test" }),
      markBookingPaid(booking.id, { provider: "test" }),
      markBookingPaid(booking.id, { provider: "test" }),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });
});
