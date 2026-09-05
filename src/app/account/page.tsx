import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, History, CarFront, User } from "lucide-react";

import { getTranslations } from "@/i18n";
import { requireUser } from "@/lib/auth";
import { getClientBookings } from "@/server/bookings";
import { DashboardShell, EmptyState } from "@/components/DashboardShell";
import { BookingRow } from "@/components/BookingRow";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser();
  const { t } = await getTranslations();
  const rows = await getClientBookings(user.id);

  const now = Date.now();
  const upcoming = rows.filter(
    (r) =>
      r.booking.status !== "cancelled" &&
      r.booking.status !== "completed" &&
      r.booking.scheduledAt.getTime() >= now - 6 * 3600_000,
  );
  const past = rows.filter((r) => !upcoming.includes(r));

  return (
    <DashboardShell
      title={t.account.title}
      subtitle={user.email ?? undefined}
      activeHref="/account"
      tabs={[
        { href: "/account", label: t.account.myBookings, icon: CalendarClock },
        { href: "/account/profile", label: t.account.profile, icon: User },
      ]}
      actions={
        <Button asChild size="sm">
          <Link href="/booking">{t.common.bookNow}</Link>
        </Button>
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={CarFront}
          title={t.account.noBookings}
          action={
            <Button asChild>
              <Link href="/booking">{t.account.bookFirst}</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="flex items-center gap-2 eyebrow">
              <CalendarClock className="size-3.5" aria-hidden />
              {t.account.upcoming}
            </h2>
            {upcoming.length === 0 ? (
              <p className="mt-4 text-sm text-ink-400">{t.common.noResults}</p>
            ) : (
              <div className="mt-5 space-y-3">
                {upcoming.map((row) => (
                  <BookingRow
                    key={row.booking.id}
                    booking={row.booking}
                    vehicleName={row.vehicle.name}
                    vehicleImage={row.vehicle.imageUrls[0]}
                    href={`/booking/${row.booking.reference}`}
                    t={t}
                    intl={t.meta.intl}
                  />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 ? (
            <section>
              <h2 className="flex items-center gap-2 eyebrow">
                <History className="size-3.5" aria-hidden />
                {t.account.past}
              </h2>
              <div className="mt-5 space-y-3">
                {past.map((row) => (
                  <BookingRow
                    key={row.booking.id}
                    booking={row.booking}
                    vehicleName={row.vehicle.name}
                    vehicleImage={row.vehicle.imageUrls[0]}
                    href={`/booking/${row.booking.reference}`}
                    t={t}
                    intl={t.meta.intl}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </DashboardShell>
  );
}
