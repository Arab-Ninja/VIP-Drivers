import type { Metadata } from "next";
import Link from "next/link";
import {
  Euro,
  CalendarRange,
  Clock,
  UserCog,
  Users,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

import { getTranslations } from "@/i18n";
import { requireRole } from "@/lib/auth";
import { getAdminOverview, listBookingsForAdmin } from "@/server/admin";
import { DashboardShell, StatTile } from "@/components/DashboardShell";
import { adminTabs } from "@/components/admin/AdminTabs";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { Card } from "@/components/ui/card";
import { BookingRow } from "@/components/BookingRow";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/pricing";

export const metadata: Metadata = { title: "Administration", robots: { index: false } };

export default async function AdminOverviewPage() {
  await requireRole("admin");
  const { t } = await getTranslations();
  const intl = t.meta.intl;

  const [overview, recent] = await Promise.all([
    getAdminOverview(),
    listBookingsForAdmin({ limit: 6 }),
  ]);

  return (
    <DashboardShell
      title={t.admin.title}
      activeHref="/admin"
      tabs={adminTabs(t, { messages: overview.unreadMessages || undefined })}
    >
      {overview.bookingsUnassigned > 0 || overview.driversPending > 0 ? (
        <div className="mb-8 flex flex-wrap items-center gap-4 rounded-lg border border-warning/40 bg-warning/8 px-5 py-4">
          <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden />
          <p className="flex-1 text-sm text-ink-200">
            {overview.bookingsUnassigned > 0
              ? `${overview.bookingsUnassigned} ${t.admin.kpiUnassigned.toLowerCase()}.`
              : ""}{" "}
            {overview.driversPending > 0
              ? `${overview.driversPending} ${t.driver.statusPending.toLowerCase()}.`
              : ""}
          </p>
          {overview.bookingsUnassigned > 0 ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/bookings?unassigned=1">{t.admin.bookings}</Link>
            </Button>
          ) : null}
          {overview.driversPending > 0 ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/drivers">{t.admin.drivers}</Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label={t.admin.kpiRevenue}
          value={formatCents(overview.revenueCents, intl)}
          hint={`30 j : ${formatCents(overview.revenue30dCents, intl)}`}
          icon={Euro}
          tone="gold"
        />
        <StatTile
          label={t.admin.kpiBookings}
          value={String(overview.bookingsTotal)}
          hint={`${overview.bookingsCompleted} ${t.status.completed.toLowerCase()}`}
          icon={CalendarRange}
        />
        <StatTile
          label={t.admin.kpiPending}
          value={String(overview.bookingsPending)}
          hint={t.status.pendingHint}
          icon={Clock}
        />
        <StatTile
          label={t.admin.kpiUnassigned}
          value={String(overview.bookingsUnassigned)}
          hint={`${overview.bookingsConfirmed} ${t.status.confirmed.toLowerCase()}`}
          icon={AlertTriangle}
        />
        <StatTile
          label={t.admin.kpiDrivers}
          value={String(overview.driversApproved)}
          hint={`${overview.driversPending} ${t.status.pending.toLowerCase()}`}
          icon={UserCog}
        />
        <StatTile label={t.admin.kpiClients} value={String(overview.clients)} icon={Users} />
      </div>

      <Card className="mt-6 p-6">
        <h2 className="eyebrow">{t.admin.revenueChart}</h2>
        <div className="mt-6">
          <RevenueChart data={overview.daily} />
        </div>
      </Card>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="eyebrow">{t.admin.recentBookings}</h2>
          <Link
            href="/admin/bookings"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-gold-300 hover:text-gold-200"
          >
            {t.admin.allBookings}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="mt-5 space-y-3">
          {recent.length === 0 ? (
            <p className="text-sm text-ink-400">{t.common.noResults}</p>
          ) : (
            recent.map((row) => (
              <BookingRow
                key={row.booking.id}
                booking={row.booking}
                vehicleName={row.vehicle.name}
                href={`/admin/bookings/${row.booking.id}`}
                t={t}
                intl={intl}
                meta={[row.client.name, row.client.email].filter(Boolean).join(" · ")}
              />
            ))
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
