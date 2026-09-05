import type { Metadata } from "next";
import { ListChecks } from "lucide-react";

import { getTranslations } from "@/i18n";
import { requireUser } from "@/lib/auth";
import { getDriverRides } from "@/server/bookings";
import { getDriverProfile } from "@/server/drivers";
import { DashboardShell, EmptyState } from "@/components/DashboardShell";
import { BookingRow } from "@/components/BookingRow";
import { driverTabs } from "@/components/driver/DriverTabs";
import { CompleteButton } from "@/components/driver/ClaimButton";

export const metadata: Metadata = { title: "Mes trajets", robots: { index: false } };

export default async function DriverRidesPage() {
  const user = await requireUser();
  const { t } = await getTranslations();
  const [rides, profile] = await Promise.all([getDriverRides(user.id), getDriverProfile(user.id)]);

  const upcoming = rides.filter((r) => r.booking.status === "confirmed");
  const done = rides.filter((r) => r.booking.status !== "confirmed");

  return (
    <DashboardShell title={t.driver.myRides} activeHref="/driver/rides" tabs={driverTabs(t)}>
      {rides.length === 0 ? (
        <EmptyState icon={ListChecks} title={t.driver.noRides} body={t.driver.availableHint} />
      ) : (
        <div className="space-y-10">
          {upcoming.length > 0 ? (
            <section>
              <h2 className="eyebrow">{t.driver.upcomingRides}</h2>
              <div className="mt-5 space-y-3">
                {upcoming.map((row) => (
                  <BookingRow
                    key={row.booking.id}
                    booking={row.booking}
                    vehicleName={row.vehicle.name}
                    t={t}
                    intl={t.meta.intl}
                    amountCents={row.booking.driverEarningsCents}
                    amountLabel={t.driver.netEarning}
                    meta={[row.client.name, row.client.phone].filter(Boolean).join(" · ") || null}
                    action={<CompleteButton bookingId={row.booking.id} />}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {done.length > 0 ? (
            <section>
              <h2 className="eyebrow">{t.account.past}</h2>
              <div className="mt-5 space-y-3">
                {done.map((row) => (
                  <BookingRow
                    key={row.booking.id}
                    booking={row.booking}
                    vehicleName={row.vehicle.name}
                    t={t}
                    intl={t.meta.intl}
                    amountCents={row.booking.driverEarningsCents}
                    amountLabel={t.driver.netEarning}
                    meta={[row.client.name, row.client.phone].filter(Boolean).join(" · ") || null}
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
