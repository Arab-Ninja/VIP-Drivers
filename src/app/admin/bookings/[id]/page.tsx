import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";

import { getTranslations } from "@/i18n";
import { requireRole } from "@/lib/auth";
import { getBookingWithRelations, getBookingEvents } from "@/server/bookings";
import { listAssignableDrivers, countUnreadMessages } from "@/server/admin";
import { DashboardShell } from "@/components/DashboardShell";
import { adminTabs } from "@/components/admin/AdminTabs";
import { BookingAdminPanel } from "@/components/admin/BookingAdminPanel";
import { BookingDetail } from "@/components/booking/BookingDetail";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { isStripeConfigured } from "@/lib/stripe";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Réservation", robots: { index: false } };

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;
  const { t } = await getTranslations();

  const record = await getBookingWithRelations({ id });
  if (!record) notFound();

  const [drivers, events, unread] = await Promise.all([
    listAssignableDrivers(),
    getBookingEvents(id),
    countUnreadMessages(),
  ]);

  const { booking, vehicle, driver } = record;

  return (
    <DashboardShell
      title={booking.reference}
      subtitle={`${record.client.name ?? ""} · ${record.client.email ?? ""}`}
      activeHref="/admin/bookings"
      tabs={adminTabs(t, { messages: unread || undefined })}
      actions={
        <Link
          href="/admin/bookings"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-ink-300 hover:text-gold-300"
        >
          <ArrowLeft className="size-3.5" />
          {t.common.back}
        </Link>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_360px] xl:items-start">
        <div className="min-w-0 space-y-6">
          <BookingDetail
            booking={booking}
            vehicleName={vehicle.name}
            vehicleImage={vehicle.imageUrls[0] ?? null}
            driver={driver}
            canManage
            paymentsAvailable={isStripeConfigured()}
            demoMode={!isStripeConfigured() && env.demoPaymentsEnabled}
          />

          <Card className="p-6">
            <h2 className="flex items-center gap-2 eyebrow">
              <History className="size-3.5" aria-hidden />
              {t.common.details}
            </h2>
            <ol className="mt-5 space-y-4">
              {events.map((row) => (
                <li key={row.event.id} className="flex gap-4 text-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold-600" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-ink-100">
                      <span className="font-mono text-xs text-gold-400">{row.event.type}</span>
                      {row.event.message ? (
                        <span className="ml-2 text-ink-300">{row.event.message}</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {formatDateTime(row.event.createdAt, t.meta.intl)}
                      {row.actor?.name ? ` · ${row.actor.name}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <BookingAdminPanel booking={booking} drivers={drivers} />
      </div>
    </DashboardShell>
  );
}
