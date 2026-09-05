import "server-only";
import { and, count, desc, eq, gte, ilike, isNull, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import {
  bookings,
  contactMessages,
  driverProfiles,
  users,
  vehicleCategories,
  type BookingStatus,
} from "@/db/schema";

export type AdminOverview = {
  revenueCents: number;
  revenue30dCents: number;
  bookingsTotal: number;
  bookingsPending: number;
  bookingsConfirmed: number;
  bookingsUnassigned: number;
  bookingsCompleted: number;
  clients: number;
  driversApproved: number;
  driversPending: number;
  unreadMessages: number;
  /** Paid revenue per day over the last 30 days, for the chart. */
  daily: { date: string; revenueCents: number; bookings: number }[];
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const [totals] = await db
    .select({
      // Revenue counts money actually taken, so unpaid bookings never
      // inflate the figure the operator makes decisions on.
      revenueCents: sql<number>`coalesce(sum(${bookings.priceTtcCents}) filter (where ${bookings.paymentStatus} = 'paid'), 0)::int`,
      revenue30dCents: sql<number>`coalesce(sum(${bookings.priceTtcCents}) filter (where ${bookings.paymentStatus} = 'paid' and ${bookings.paidAt} >= ${since.toISOString()}), 0)::int`,
      bookingsTotal: sql<number>`count(*)::int`,
      bookingsPending: sql<number>`count(*) filter (where ${bookings.status} = 'pending')::int`,
      bookingsConfirmed: sql<number>`count(*) filter (where ${bookings.status} = 'confirmed')::int`,
      bookingsUnassigned: sql<number>`count(*) filter (where ${bookings.status} = 'confirmed' and ${bookings.driverId} is null)::int`,
      bookingsCompleted: sql<number>`count(*) filter (where ${bookings.status} = 'completed')::int`,
    })
    .from(bookings);

  const [people] = await db
    .select({
      clients: sql<number>`count(*) filter (where ${users.role} = 'client')::int`,
    })
    .from(users);

  const [drivers] = await db
    .select({
      approved: sql<number>`count(*) filter (where ${driverProfiles.status} = 'approved')::int`,
      pending: sql<number>`count(*) filter (where ${driverProfiles.status} = 'pending')::int`,
    })
    .from(driverProfiles);

  const [messages] = await db
    .select({ unread: sql<number>`count(*) filter (where ${contactMessages.status} = 'new')::int` })
    .from(contactMessages);

  const dailyRows = await db
    .select({
      date: sql<string>`to_char(date_trunc('day', ${bookings.paidAt}), 'YYYY-MM-DD')`,
      revenueCents: sql<number>`coalesce(sum(${bookings.priceTtcCents}), 0)::int`,
      bookings: sql<number>`count(*)::int`,
    })
    .from(bookings)
    .where(and(eq(bookings.paymentStatus, "paid"), gte(bookings.paidAt, since)))
    .groupBy(sql`date_trunc('day', ${bookings.paidAt})`)
    .orderBy(sql`date_trunc('day', ${bookings.paidAt})`);

  const byDate = new Map(dailyRows.map((r) => [r.date, r]));
  const daily: AdminOverview["daily"] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000);
    const key = d.toISOString().slice(0, 10);
    const hit = byDate.get(key);
    daily.push({ date: key, revenueCents: hit?.revenueCents ?? 0, bookings: hit?.bookings ?? 0 });
  }

  return {
    revenueCents: totals?.revenueCents ?? 0,
    revenue30dCents: totals?.revenue30dCents ?? 0,
    bookingsTotal: totals?.bookingsTotal ?? 0,
    bookingsPending: totals?.bookingsPending ?? 0,
    bookingsConfirmed: totals?.bookingsConfirmed ?? 0,
    bookingsUnassigned: totals?.bookingsUnassigned ?? 0,
    bookingsCompleted: totals?.bookingsCompleted ?? 0,
    clients: people?.clients ?? 0,
    driversApproved: drivers?.approved ?? 0,
    driversPending: drivers?.pending ?? 0,
    unreadMessages: messages?.unread ?? 0,
    daily,
  };
}

export type AdminBookingFilters = {
  status?: BookingStatus;
  unassigned?: boolean;
  search?: string;
  limit?: number;
};

export async function listBookingsForAdmin(filters: AdminBookingFilters = {}) {
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(bookings.status, filters.status));
  if (filters.unassigned) conditions.push(isNull(bookings.driverId));
  if (filters.search) {
    const term = `%${filters.search}%`;
    const search = or(
      ilike(bookings.reference, term),
      ilike(bookings.contactName, term),
      ilike(bookings.contactEmail, term),
      ilike(bookings.pickupAddress, term),
      ilike(bookings.dropoffAddress, term),
    );
    if (search) conditions.push(search);
  }

  return db
    .select({
      booking: bookings,
      vehicle: { id: vehicleCategories.id, name: vehicleCategories.name },
      client: { id: users.id, name: users.name, email: users.email },
    })
    .from(bookings)
    .innerJoin(vehicleCategories, eq(bookings.vehicleCategoryId, vehicleCategories.id))
    .innerJoin(users, eq(bookings.clientId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(bookings.createdAt))
    .limit(filters.limit ?? 100);
}

export async function listClients(search?: string) {
  const term = search ? `%${search}%` : null;
  return db
    .select({
      user: users,
      bookingCount: sql<number>`(select count(*)::int from ${bookings} where ${bookings.clientId} = ${users.id})`,
      spentCents: sql<number>`(select coalesce(sum(${bookings.priceTtcCents}), 0)::int from ${bookings} where ${bookings.clientId} = ${users.id} and ${bookings.paymentStatus} = 'paid')`,
    })
    .from(users)
    .where(
      term
        ? and(
            or(ilike(users.name, term), ilike(users.email, term), ilike(users.phone, term)),
          )
        : undefined,
    )
    .orderBy(desc(users.createdAt))
    .limit(200);
}

/** Approved drivers, for the admin's manual assignment dropdown. */
export async function listAssignableDrivers() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      companyName: driverProfiles.companyName,
      commissionBps: driverProfiles.commissionBps,
    })
    .from(driverProfiles)
    .innerJoin(users, eq(driverProfiles.userId, users.id))
    .where(and(eq(driverProfiles.status, "approved"), isNull(users.blockedAt)))
    .orderBy(users.name);
}

export async function listContactMessages() {
  return db
    .select({
      message: contactMessages,
      user: { id: users.id, name: users.name },
    })
    .from(contactMessages)
    .leftJoin(users, eq(contactMessages.userId, users.id))
    .orderBy(desc(contactMessages.createdAt))
    .limit(200);
}

export async function countUnreadMessages(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(contactMessages)
    .where(eq(contactMessages.status, "new"));
  return Number(row?.value ?? 0);
}
