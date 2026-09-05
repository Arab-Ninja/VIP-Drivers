import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  bookings,
  driverProfiles,
  users,
  type DriverProfile,
  type DriverStatus,
} from "@/db/schema";

export async function getDriverProfile(userId: string): Promise<DriverProfile | null> {
  const [row] = await db
    .select()
    .from(driverProfiles)
    .where(eq(driverProfiles.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function listDrivers(status?: DriverStatus) {
  return db
    .select({
      profile: driverProfiles,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        blockedAt: users.blockedAt,
        createdAt: users.createdAt,
      },
      completedRides: sql<number>`(
        select count(*)::int from ${bookings}
        where ${bookings.driverId} = ${driverProfiles.userId}
          and ${bookings.status} = 'completed'
      )`,
    })
    .from(driverProfiles)
    .innerJoin(users, eq(driverProfiles.userId, users.id))
    .where(status ? eq(driverProfiles.status, status) : undefined)
    .orderBy(desc(driverProfiles.createdAt));
}

export type DriverEarnings = {
  completedRides: number;
  upcomingRides: number;
  grossHtvaCents: number;
  commissionCents: number;
  netCents: number;
  pendingNetCents: number;
  averageFareCents: number;
  /** Net earnings per calendar month, oldest first, for the chart. */
  monthly: { month: string; netCents: number; rides: number }[];
};

/**
 * Everything the driver dashboard shows.
 *
 * "Completed" figures are money earned; "pending" is work taken but not yet
 * carried out. Keeping them apart is the difference between a driver
 * believing they have been paid and knowing what is still to come.
 */
export async function getDriverEarnings(driverId: string): Promise<DriverEarnings> {
  const [totals] = await db
    .select({
      completedRides: sql<number>`count(*) filter (where ${bookings.status} = 'completed')::int`,
      upcomingRides: sql<number>`count(*) filter (where ${bookings.status} = 'confirmed')::int`,
      grossHtvaCents: sql<number>`coalesce(sum(${bookings.priceHtvaCents}) filter (where ${bookings.status} = 'completed'), 0)::int`,
      commissionCents: sql<number>`coalesce(sum(${bookings.commissionCents}) filter (where ${bookings.status} = 'completed'), 0)::int`,
      netCents: sql<number>`coalesce(sum(${bookings.driverEarningsCents}) filter (where ${bookings.status} = 'completed'), 0)::int`,
      pendingNetCents: sql<number>`coalesce(sum(${bookings.driverEarningsCents}) filter (where ${bookings.status} = 'confirmed'), 0)::int`,
    })
    .from(bookings)
    .where(eq(bookings.driverId, driverId));

  const monthlyRows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${bookings.completedAt}), 'YYYY-MM')`,
      netCents: sql<number>`coalesce(sum(${bookings.driverEarningsCents}), 0)::int`,
      rides: sql<number>`count(*)::int`,
    })
    .from(bookings)
    .where(and(eq(bookings.driverId, driverId), eq(bookings.status, "completed")))
    .groupBy(sql`date_trunc('month', ${bookings.completedAt})`)
    .orderBy(sql`date_trunc('month', ${bookings.completedAt})`);

  // Fill the last six months so the chart never has holes in it.
  const months: { month: string; netCents: number; rides: number }[] = [];
  const byMonth = new Map(monthlyRows.map((r) => [r.month, r]));
  const cursor = new Date();
  cursor.setDate(1);
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const hit = byMonth.get(key);
    months.push({ month: key, netCents: hit?.netCents ?? 0, rides: hit?.rides ?? 0 });
  }

  const completedRides = totals?.completedRides ?? 0;
  return {
    completedRides,
    upcomingRides: totals?.upcomingRides ?? 0,
    grossHtvaCents: totals?.grossHtvaCents ?? 0,
    commissionCents: totals?.commissionCents ?? 0,
    netCents: totals?.netCents ?? 0,
    pendingNetCents: totals?.pendingNetCents ?? 0,
    averageFareCents: completedRides > 0 ? Math.round((totals!.netCents ?? 0) / completedRides) : 0,
    monthly: months,
  };
}
