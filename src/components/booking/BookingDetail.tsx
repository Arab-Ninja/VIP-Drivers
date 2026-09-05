"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MapPin,
  Flag,
  CalendarClock,
  Users,
  Briefcase,
  Plane,
  StickyNote,
  CreditCard,
  Car,
  Phone,
  Mail,
  Loader2,
  Ban,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, PaymentBadge } from "@/components/StatusBadge";
import { useI18n } from "@/i18n/client";
import { formatCents, type PriceQuote } from "@/lib/pricing";
import { formatDateTime, formatDistance, formatDuration, cn } from "@/lib/utils";
import { startCheckout } from "@/app/actions/payment";
import { cancelOwnBooking } from "@/app/actions/booking";
import { PriceSummary } from "@/components/booking/PriceSummary";
import type { Booking } from "@/db/schema";

export type BookingDetailProps = {
  booking: Booking;
  vehicleName: string;
  vehicleImage: string | null;
  driver: { name: string | null; phone: string | null; companyName: string | null } | null;
  /** Whether the viewer may pay for and cancel this booking. */
  canManage: boolean;
  paymentsAvailable: boolean;
  demoMode: boolean;
};

export function BookingDetail({
  booking,
  vehicleName,
  vehicleImage,
  driver,
  canManage,
  paymentsAvailable,
  demoMode,
}: BookingDetailProps) {
  const { t, intl } = useI18n();
  const router = useRouter();
  const [paying, startPaying] = useTransition();
  const [cancelling, setCancelling] = useState(false);

  const quote = (booking.priceBreakdown ?? null) as PriceQuote | null;
  const needsPayment = booking.status === "pending" && booking.paymentStatus !== "paid";
  const cancellable =
    canManage && booking.status !== "completed" && booking.status !== "cancelled";

  function onPay() {
    startPaying(async () => {
      const result = await startCheckout(booking.id);
      if (!result.ok) {
        toast.error(t.common.errorTitle);
        return;
      }
      if (result.kind === "redirect") {
        window.location.href = result.url;
        return;
      }
      toast.success(t.status.paid);
      router.refresh();
    });
  }

  async function onCancel() {
    if (!window.confirm(t.account.cancelConfirm)) return;
    setCancelling(true);
    try {
      const result = await cancelOwnBooking(booking.id);
      if (!result.ok) {
        toast.error(t.common.errorTitle);
        return;
      }
      toast.success(t.account.cancelled);
      router.refresh();
    } finally {
      setCancelling(false);
    }
  }

  const itinerary = [
    { icon: MapPin, label: t.booking.pickup, value: booking.pickupAddress, tone: "gold" },
    ...booking.stops.map((stop, index) => ({
      icon: MapPin,
      label: `${t.booking.stop} ${index + 1}`,
      value: stop.address,
      tone: "muted" as const,
    })),
    { icon: Flag, label: t.booking.dropoff, value: booking.dropoffAddress, tone: "gold" },
  ];

  const facts = [
    {
      icon: CalendarClock,
      label: t.booking.datetime,
      value: formatDateTime(booking.scheduledAt, intl),
    },
    booking.serviceType === "disposal" && booking.durationHours
      ? {
          icon: CalendarClock,
          label: t.booking.duration,
          value: `${booking.durationHours} ${t.common.hours}`,
        }
      : null,
    booking.distanceMeters > 0
      ? {
          icon: MapPin,
          label: t.booking.estimatedDistance,
          value: `${formatDistance(booking.distanceMeters, intl)} · ${formatDuration(
            booking.routeDurationSeconds,
          )}`,
        }
      : null,
    { icon: Car, label: t.common.vehicle, value: vehicleName },
    { icon: Users, label: t.common.passengers, value: String(booking.passengers) },
    { icon: Briefcase, label: t.common.luggage, value: String(booking.luggage) },
    booking.flightNumber
      ? { icon: Plane, label: t.booking.flightNumber, value: booking.flightNumber }
      : null,
  ].filter(Boolean) as { icon: typeof Users; label: string; value: string }[];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="space-y-6">
        <Card className="p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">{t.account.reference}</p>
              <h1 className="mt-2 font-display text-3xl text-ink-100">{booking.reference}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={booking.status} t={t} withHint />
              <PaymentBadge paymentStatus={booking.paymentStatus} t={t} />
            </div>
          </div>

          {vehicleImage ? (
            <div className="mt-6 flex items-center gap-4 border-y border-ink-700 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={vehicleImage} alt="" className="h-14 w-28 object-contain" />
              <div>
                <p className="text-sm text-ink-100">{vehicleName}</p>
                <p className="mt-0.5 text-xs text-ink-400">
                  {booking.serviceType === "transfer" ? t.booking.transfer : t.booking.disposal}
                </p>
              </div>
            </div>
          ) : null}

          <ol className="mt-7 space-y-0">
            {itinerary.map((step, index) => (
              <li key={`${step.label}-${index}`} className="relative flex gap-4 pb-6 last:pb-0">
                {index < itinerary.length - 1 ? (
                  <span
                    className="absolute left-[0.6875rem] top-6 h-full w-px bg-ink-700"
                    aria-hidden
                  />
                ) : null}
                <span
                  className={cn(
                    "relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border",
                    step.tone === "gold"
                      ? "border-gold-600/60 bg-ink-900 text-gold-400"
                      : "border-ink-600 bg-ink-900 text-ink-400",
                  )}
                >
                  <step.icon className="size-3" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.65rem] uppercase tracking-wider text-ink-400">
                    {step.label}
                  </span>
                  <span className="mt-1 block text-sm text-ink-100">{step.value}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-6 lg:p-8">
          <h2 className="eyebrow">{t.common.details}</h2>
          <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {facts.map((fact) => (
              <div key={fact.label} className="flex gap-3">
                <fact.icon className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />
                <div className="min-w-0">
                  <dt className="text-[0.65rem] uppercase tracking-wider text-ink-400">
                    {fact.label}
                  </dt>
                  <dd className="mt-1 text-sm text-ink-100">{fact.value}</dd>
                </div>
              </div>
            ))}
          </dl>

          {booking.notes ? (
            <div className="mt-6 flex gap-3 border-t border-ink-700 pt-5">
              <StickyNote className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />
              <div>
                <p className="text-[0.65rem] uppercase tracking-wider text-ink-400">
                  {t.booking.notes}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-ink-200">{booking.notes}</p>
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="p-6 lg:p-8">
          <h2 className="eyebrow">{t.account.yourDriver}</h2>
          {driver ? (
            <div className="mt-5 space-y-2 text-sm">
              <p className="text-ink-100">{driver.name}</p>
              {driver.companyName ? <p className="text-ink-400">{driver.companyName}</p> : null}
              {driver.phone ? (
                <a
                  href={`tel:${driver.phone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-2 text-gold-300 hover:text-gold-200"
                >
                  <Phone className="size-3.5" aria-hidden />
                  {driver.phone}
                </a>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-400">{t.account.driverPending}</p>
          )}
        </Card>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24">
        <Card className="p-6">
          <h2 className="font-display text-2xl text-ink-100">{t.booking.summary}</h2>

          {quote?.lines ? (
            <PriceSummary
              className="mt-5"
              quote={quote}
              route={{
                distanceMeters: booking.distanceMeters,
                durationSeconds: booking.routeDurationSeconds,
                provider: "stored",
                estimated: false,
              }}
            />
          ) : (
            <div className="mt-5 flex items-baseline justify-between border-t border-gold-600/40 pt-4">
              <span className="text-sm uppercase tracking-wider text-ink-200">
                {t.common.total} {t.common.tvac}
              </span>
              <span className="font-display text-3xl text-gradient-gold">
                {formatCents(booking.priceTtcCents, intl)}
              </span>
            </div>
          )}

          {canManage && needsPayment ? (
            <>
              <Button className="mt-6 w-full" size="lg" onClick={onPay} disabled={paying}>
                {paying ? <Loader2 className="animate-spin" /> : <CreditCard />}
                {paying ? t.common.loading : t.booking.payNow}
              </Button>

              {!paymentsAvailable ? (
                <p className="mt-3 text-[0.7rem] leading-relaxed text-warning">
                  {demoMode
                    ? "Mode démonstration : le paiement est simulé, aucune somme n'est prélevée."
                    : "Le paiement en ligne n'est pas encore configuré."}
                </p>
              ) : null}
            </>
          ) : null}

          {cancellable ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 w-full text-ink-400 hover:text-danger"
              onClick={onCancel}
              disabled={cancelling}
            >
              {cancelling ? <Loader2 className="animate-spin" /> : <Ban />}
              {t.account.cancelBooking}
            </Button>
          ) : null}
        </Card>

        <Card className="p-6">
          <h3 className="eyebrow">{t.booking.contactDetails}</h3>
          <div className="mt-4 space-y-2 text-sm">
            <p className="text-ink-100">{booking.contactName}</p>
            <a
              href={`tel:${booking.contactPhone.replace(/\s/g, "")}`}
              className="flex items-center gap-2 text-ink-300 hover:text-gold-300"
            >
              <Phone className="size-3.5" aria-hidden />
              {booking.contactPhone}
            </a>
            <a
              href={`mailto:${booking.contactEmail}`}
              className="flex items-center gap-2 text-ink-300 hover:text-gold-300"
            >
              <Mail className="size-3.5" aria-hidden />
              {booking.contactEmail}
            </a>
          </div>
        </Card>
      </aside>
    </div>
  );
}
