import type { Metadata } from "next";
import Link from "next/link";
import { Search, CalendarRange } from "lucide-react";

import { getTranslations } from "@/i18n";
import { requireRole } from "@/lib/auth";
import { listBookingsForAdmin, countUnreadMessages } from "@/server/admin";
import { DashboardShell, EmptyState } from "@/components/DashboardShell";
import { adminTabs } from "@/components/admin/AdminTabs";
import { BookingRow } from "@/components/BookingRow";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/db/schema";

export const metadata: Metadata = { title: "Réservations", robots: { index: false } };

const STATUSES: (BookingStatus | "all")[] = [
  "all",
  "pending",
  "confirmed",
  "completed",
  "cancelled",
];

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; unassigned?: string }>;
}) {
  await requireRole("admin");
  const params = await searchParams;
  const { t } = await getTranslations();

  const status = STATUSES.includes(params.status as BookingStatus)
    ? (params.status as BookingStatus)
    : undefined;
  const unassigned = params.unassigned === "1";

  const [rows, unread] = await Promise.all([
    listBookingsForAdmin({ status, unassigned, search: params.q }),
    countUnreadMessages(),
  ]);

  function filterHref(next: Record<string, string | undefined>) {
    const search = new URLSearchParams();
    const merged = { status: params.status, q: params.q, unassigned: params.unassigned, ...next };
    for (const [key, value] of Object.entries(merged)) {
      if (value) search.set(key, value);
    }
    const qs = search.toString();
    return qs ? `/admin/bookings?${qs}` : "/admin/bookings";
  }

  return (
    <DashboardShell
      title={t.admin.allBookings}
      subtitle={`${rows.length} ${t.admin.bookings.toLowerCase()}`}
      activeHref="/admin/bookings"
      tabs={adminTabs(t, { messages: unread || undefined })}
    >
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((value) => {
            const active = value === "all" ? !status : status === value;
            return (
              <Link
                key={value}
                href={filterHref({ status: value === "all" ? undefined : value })}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs transition-colors",
                  active
                    ? "border-gold-500/70 bg-gold-500/12 text-gold-200"
                    : "border-ink-700 bg-ink-900 text-ink-300 hover:border-ink-600",
                )}
              >
                {value === "all" ? t.common.all : t.status[value]}
              </Link>
            );
          })}
          <Link
            href={filterHref({ unassigned: unassigned ? undefined : "1" })}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs transition-colors",
              unassigned
                ? "border-warning/60 bg-warning/12 text-[#e8c377]"
                : "border-ink-700 bg-ink-900 text-ink-300 hover:border-ink-600",
            )}
          >
            {t.status.unassigned}
          </Link>
        </div>

        <form action="/admin/bookings" method="get" className="relative w-full lg:w-80">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          {unassigned ? <input type="hidden" name="unassigned" value="1" /> : null}
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
          <Input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder={`${t.common.search}…`}
            className="pl-9"
            aria-label={t.common.search}
          />
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={CalendarRange} title={t.common.noResults} />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <BookingRow
              key={row.booking.id}
              booking={row.booking}
              vehicleName={row.vehicle.name}
              href={`/admin/bookings/${row.booking.id}`}
              t={t}
              intl={t.meta.intl}
              meta={[row.client.name, row.client.email].filter(Boolean).join(" · ")}
            />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
