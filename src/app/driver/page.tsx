import type { Metadata } from "next";
import Link from "next/link";
import { CarFront } from "lucide-react";

import { getTranslations } from "@/i18n";
import { requireUser } from "@/lib/auth";
import { getAvailableRides } from "@/server/bookings";
import { getDriverProfile } from "@/server/drivers";
import { DashboardShell, EmptyState } from "@/components/DashboardShell";
import { BookingRow } from "@/components/BookingRow";
import { driverTabs } from "@/components/driver/DriverTabs";
import { DriverStatusNotice } from "@/components/driver/DriverStatusNotice";
import { ClaimButton } from "@/components/driver/ClaimButton";
import { Button } from "@/components/ui/button";
import { splitDriverEarnings } from "@/lib/pricing";

export const metadata: Metadata = { title: "Trajets disponibles", robots: { index: false } };

export default async function DriverAvailablePage() {
  const user = await requireUser();
  const { t } = await getTranslations();
  const profile = await getDriverProfile(user.id);

  // Someone who has never applied is sent to the application form.
  if (!profile && user.role !== "admin") {
    return (
      <DashboardShell
        title={t.driver.portalTitle}
        activeHref="/driver"
        tabs={driverTabs(t)}
      >
        <EmptyState
          icon={CarFront}
          title={t.driver.signupTitle}
          body={t.driver.signupSubtitle}
          action={
            <Button asChild>
              <Link href="/driver/apply">{t.driver.submitApplication}</Link>
            </Button>
          }
        />
      </DashboardShell>
    );
  }

  const rides = await getAvailableRides();
  const approved = profile?.status === "approved" || user.role === "admin";
  const commissionBps = profile?.commissionBps ?? 2000;

  return (
    <DashboardShell
      title={t.driver.available}
      subtitle={t.driver.availableHint}
      activeHref="/driver"
      tabs={driverTabs(t, rides.length || undefined)}
    >
      {profile ? <DriverStatusNotice status={profile.status} t={t} /> : null}

      {rides.length === 0 ? (
        <EmptyState icon={CarFront} title={t.driver.noAvailable} />
      ) : (
        <div className="space-y-3">
          {rides.map((row) => {
            const { driverEarningsCents } = splitDriverEarnings(
              row.booking.priceHtvaCents,
              commissionBps,
            );
            return (
              <BookingRow
                key={row.booking.id}
                booking={row.booking}
                vehicleName={row.vehicle.name}
                vehicleImage={row.vehicle.imageUrls[0]}
                t={t}
                intl={t.meta.intl}
                amountCents={driverEarningsCents}
                amountLabel={t.driver.netEarning}
                meta={
                  row.booking.flightNumber
                    ? `${t.booking.flightNumber}: ${row.booking.flightNumber}`
                    : row.booking.notes
                      ? row.booking.notes.slice(0, 120)
                      : null
                }
                action={approved ? <ClaimButton bookingId={row.booking.id} /> : null}
              />
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
