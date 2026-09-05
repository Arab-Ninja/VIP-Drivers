"use client";

import { Loader2, Info } from "lucide-react";

import { formatCents, type PriceQuote } from "@/lib/pricing";
import { formatDistance, formatDuration } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

export type RouteInfo = {
  distanceMeters: number;
  durationSeconds: number;
  provider: string;
  estimated: boolean;
};

const LINE_LABEL = {
  base: "lineBase",
  minimum_adjustment: "lineMinimum",
  night: "lineNight",
  weekend: "lineWeekend",
  stops: "lineStops",
} as const;

/**
 * The live price preview. Shown while options are still being chosen and
 * again on the confirmation page, so what the client agreed to and what they
 * later look up are rendered by the same component.
 */
export function PriceSummary({
  quote,
  route,
  loading,
  hint,
  className,
}: {
  quote: PriceQuote | null;
  route?: RouteInfo | null;
  loading?: boolean;
  /** Message shown in place of a price when the form is incomplete. */
  hint?: string;
  className?: string;
}) {
  const { t, intl } = useI18n();

  if (loading) {
    return (
      <div className={cn("flex items-center gap-3 py-10 text-sm text-ink-300", className)}>
        <Loader2 className="size-4 animate-spin text-gold-400" />
        {t.booking.priceUpdating}
      </div>
    );
  }

  if (!quote) {
    return (
      <p className={cn("py-10 text-center text-sm leading-relaxed text-ink-400", className)}>
        {hint ?? t.booking.fillAddresses}
      </p>
    );
  }

  return (
    <div className={className}>
      {route && route.distanceMeters > 0 ? (
        <dl className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-ink-700 bg-ink-700">
          <div className="bg-ink-850 px-3 py-2.5">
            <dt className="text-[0.65rem] uppercase tracking-wider text-ink-400">
              {t.booking.estimatedDistance}
            </dt>
            <dd className="mt-1 text-sm text-ink-100">
              {formatDistance(route.distanceMeters, intl)}
            </dd>
          </div>
          <div className="bg-ink-850 px-3 py-2.5">
            <dt className="text-[0.65rem] uppercase tracking-wider text-ink-400">
              {t.booking.estimatedDuration}
            </dt>
            <dd className="mt-1 text-sm text-ink-100">{formatDuration(route.durationSeconds)}</dd>
          </div>
        </dl>
      ) : null}

      <h4 className="eyebrow">{t.booking.priceBreakdown}</h4>

      <dl className="mt-4 space-y-2.5 text-sm">
        {quote.lines.map((line) => (
          <div key={line.key} className="flex items-baseline justify-between gap-4">
            <dt className="text-ink-300">
              {t.booking[LINE_LABEL[line.key]]}
              {line.detail ? (
                <span className="ml-1.5 text-xs text-ink-500">({line.detail})</span>
              ) : null}
            </dt>
            <dd className="shrink-0 tabular-nums text-ink-100">
              {formatCents(line.amountCents, intl)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 space-y-2.5 border-t border-ink-700 pt-4 text-sm">
        <div className="flex items-baseline justify-between">
          <dt className="text-ink-300">
            {t.common.total} {t.common.htva}
          </dt>
          <dd className="tabular-nums text-ink-100">{formatCents(quote.htvaCents, intl)}</dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-ink-300">
            {t.common.vat} {quote.vatBps / 100}%
          </dt>
          <dd className="tabular-nums text-ink-100">{formatCents(quote.vatCents, intl)}</dd>
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between border-t border-gold-600/40 pt-4">
        <span className="text-sm uppercase tracking-wider text-ink-200">
          {t.common.total} {t.common.tvac}
        </span>
        <span className="font-display text-3xl text-gradient-gold tabular-nums">
          {formatCents(quote.ttcCents, intl)}
        </span>
      </div>

      {route?.estimated ? (
        <p className="mt-4 flex gap-2 rounded-sm border border-ink-700 bg-ink-900 px-3 py-2.5 text-[0.7rem] leading-relaxed text-ink-400">
          <Info className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
          {t.booking.estimateNotice}
        </p>
      ) : null}
    </div>
  );
}
