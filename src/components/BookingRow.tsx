import Link from "next/link";
import { MapPin, Flag, CalendarClock, Clock, ArrowRight, User } from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/pricing";
import { formatDateTime, formatDistance } from "@/lib/utils";
import type { Dictionary } from "@/i18n";
import type { Booking } from "@/db/schema";
import { cn } from "@/lib/utils";

/**
 * One booking, rendered identically for clients, drivers and admins. The
 * status badge is always present, which is what makes the lifecycle legible
 * wherever a ride appears.
 */
export function BookingRow({
  booking,
  vehicleName,
  vehicleImage,
  href,
  t,
  intl,
  /** Extra line shown under the itinerary, e.g. the client's name for a driver. */
  meta,
  /** Amount to show. Drivers see their net earning, not the fare. */
  amountCents,
  amountLabel,
  action,
  className,
}: {
  booking: Booking;
  vehicleName: string;
  vehicleImage?: string | null;
  href?: string;
  t: Dictionary;
  intl: string;
  meta?: string | null;
  amountCents?: number | null;
  amountLabel?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const amount = amountCents ?? booking.priceTtcCents;

  const body = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs tracking-wider text-gold-400">
            {booking.reference}
          </span>
          <Badge tone="neutral">
            {booking.serviceType === "transfer" ? t.booking.transfer : t.booking.disposal}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={booking.status} t={t} />
          {booking.status === "confirmed" && !booking.driverId ? (
            <Badge tone="warning">{t.status.unassigned}</Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="flex items-start gap-2 text-sm text-ink-100">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-gold-600" aria-hidden />
            <span className="truncate">{booking.pickupAddress}</span>
          </p>
          <p className="flex items-start gap-2 text-sm text-ink-300">
            <Flag className="mt-0.5 size-3.5 shrink-0 text-ink-500" aria-hidden />
            <span className="truncate">{booking.dropoffAddress}</span>
          </p>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <p className="flex items-center gap-1.5 text-xs text-ink-300 sm:justify-end">
            <CalendarClock className="size-3.5 text-ink-500" aria-hidden />
            {formatDateTime(booking.scheduledAt, intl)}
          </p>
          <p className="mt-1 flex items-center gap-3 text-xs text-ink-500 sm:justify-end">
            {booking.serviceType === "disposal" && booking.durationHours ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" aria-hidden />
                {booking.durationHours} h
              </span>
            ) : booking.distanceMeters > 0 ? (
              <span>{formatDistance(booking.distanceMeters, intl)}</span>
            ) : null}
            <span>{vehicleName}</span>
          </p>
        </div>
      </div>

      {meta ? (
        <p className="mt-3 flex items-center gap-2 border-t border-ink-800 pt-3 text-xs text-ink-400">
          <User className="size-3.5" aria-hidden />
          {meta}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-4 border-t border-ink-800 pt-4">
        <div>
          {amountLabel ? (
            <span className="block text-[0.65rem] uppercase tracking-wider text-ink-400">
              {amountLabel}
            </span>
          ) : null}
          <span className="font-display text-xl text-gold-300 tabular-nums">
            {formatCents(amount, intl)}
          </span>
        </div>
        {action ?? (href ? <ArrowRight className="size-4 text-ink-500" aria-hidden /> : null)}
      </div>
    </>
  );

  const classes = cn("surface block rounded-lg p-5", href && "surface-hover", className);

  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
