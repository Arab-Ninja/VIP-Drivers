import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, Info } from "lucide-react";

import { getTranslations, interpolate } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { getBookingWithRelations } from "@/server/bookings";
import { syncBookingPayment } from "@/server/payments";
import { verifyBookingToken } from "@/lib/booking-access";
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
  searchParams: Promise<{ paid?: string; cancelled?: string; t?: string }>;
}) {
  const { reference } = await params;
  const query = await searchParams;
  const { t } = await getTranslations();

  const user = await getCurrentUser();

  /* Authorise before reading anything.
     A booking made without an account is reached through a signed link — the
     one in the confirmation email, and the one Stripe returns to. Because the
     token is keyed by the reference, it can be checked straight from the URL,
     so an unauthorised visitor is turned away before the booking is loaded.
     Fetching first and redirecting afterwards still streams the row to the
     browser, which would hand the client's name, email and itinerary to
     anyone who guessed a reference. */
  const hasToken = verifyBookingToken(reference, query.t);

  if (!user && !hasToken) {
    const target = `/booking/${reference}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(target)}`);
  }

  let record = await getBookingWithRelations({ reference: reference.toUpperCase() });
  if (!record) notFound();

  /* A booking that started a payment but never completed one is reconciled
     against Stripe here, so a webhook that never arrived — the usual cause —
     no longer leaves a client who has genuinely paid looking at "pending".
     The `paid` flag in the URL only prompts the check; the answer comes from
     Stripe. */
  if (record.booking.paymentStatus === "processing" || query.paid) {
    const sync = await syncBookingPayment(record.booking);
    if (sync.ok && sync.changed) {
      record = (await getBookingWithRelations({ id: record.booking.id })) ?? record;
    }
  }

  const { booking, vehicle, driver } = record;

  // A booking is visible to the client who made it, the driver carrying it
  // out, and any admin. Nobody else, even with the reference.
  const isOwner = Boolean(user) && booking.clientId === user!.id;
  const isAssignedDriver = Boolean(user) && booking.driverId === user!.id;
  const isAdmin = user?.role === "admin";
  if (!hasToken && !isOwner && !isAssignedDriver && !isAdmin) notFound();

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
        canManage={isOwner || isAdmin || hasToken}
        accessToken={hasToken ? (query.t ?? null) : null}
        paymentsAvailable={isStripeConfigured()}
        demoMode={!isStripeConfigured() && env.demoPaymentsEnabled}
      />
    </Container>
  );
}
