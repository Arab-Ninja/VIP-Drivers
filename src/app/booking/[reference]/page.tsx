import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, Info } from "lucide-react";

import { getTranslations, interpolate } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { getBookingWithRelations } from "@/server/bookings";
import { Container } from "@/components/site/Section";
import { BookingDetail } from "@/components/booking/BookingDetail";
import { isStripeConfigured } from "@/lib/stripe";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Réservation", robots: { index: false } };

export default async function BookingConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ paid?: string; cancelled?: string }>;
}) {
  const { reference } = await params;
  const query = await searchParams;
  const { t } = await getTranslations();

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/booking/${reference}`)}`);
  }

  const record = await getBookingWithRelations({ reference: reference.toUpperCase() });
  if (!record) notFound();

  const { booking, vehicle, driver } = record;

  // A booking is visible to the client who made it, the driver carrying it
  // out, and any admin. Nobody else, even with the reference.
  const isOwner = booking.clientId === user.id;
  const isAssignedDriver = booking.driverId === user.id;
  if (!isOwner && !isAssignedDriver && user.role !== "admin") notFound();

  return (
    <Container className="py-14 lg:py-20">
      {booking.status === "pending" ? (
        <div className="mb-8 flex gap-3 rounded-lg border border-warning/40 bg-warning/8 px-5 py-4">
          <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <div>
            <p className="text-sm text-ink-100">{t.booking.createdTitle}</p>
            <p className="mt-1 text-sm text-ink-300">
              {interpolate(t.booking.createdBody, { reference: booking.reference })}
            </p>
          </div>
        </div>
      ) : null}

      {booking.status === "confirmed" && query.paid ? (
        <div className="mb-8 flex gap-3 rounded-lg border border-success/40 bg-success/8 px-5 py-4">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <p className="text-sm text-ink-100">{t.status.confirmedHint}</p>
        </div>
      ) : null}

      <BookingDetail
        booking={booking}
        vehicleName={vehicle.name}
        vehicleImage={vehicle.imageUrls[0] ?? null}
        driver={driver}
        canManage={isOwner || user.role === "admin"}
        paymentsAvailable={isStripeConfigured()}
        demoMode={!isStripeConfigured() && env.demoPaymentsEnabled}
      />
    </Container>
  );
}
