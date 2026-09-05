/**
 * VIP Drivers pricing engine.
 *
 * Every amount in this module is an integer number of euro cents. Money is
 * never represented as a float: `0.1 + 0.2` problems have no place on an
 * invoice, and Stripe expects integer minor units anyway.
 *
 * Two services are priced:
 *
 *   transfer  point A -> point B (with optional intermediate stops),
 *             charged per kilometre of the driven route.
 *   disposal  the car and driver are retained for a number of hours,
 *             charged per hour.
 *
 * Both are floored by a per-vehicle minimum fare, then any configured
 * surcharges are added, and Belgian VAT on passenger transport (6%) is
 * applied last.
 */

export type ServiceType = "transfer" | "disposal";

/** The three price points that define a vehicle, all VAT-exclusive (HTVA). */
export type VehicleRates = {
  pricePerKmCents: number;
  pricePerHourCents: number;
  minimumPriceCents: number;
};

/**
 * Company-wide rules, editable by an admin. Every surcharge defaults to zero
 * so the quoted price is exactly rate x quantity (floored by the minimum)
 * until the operator deliberately turns one on.
 */
export type PricingRules = {
  /** VAT rate in basis points. 600 = 6%, the Belgian passenger transport rate. */
  vatBps: number;
  /** Uplift applied when the pickup falls inside the night window. */
  nightSurchargeBps: number;
  /** Night window start hour, inclusive, in the company's local time. */
  nightStartHour: number;
  /** Night window end hour, exclusive, in the company's local time. */
  nightEndHour: number;
  /** Uplift applied to Saturday and Sunday pickups. */
  weekendSurchargeBps: number;
  /** Flat fee per intermediate stop on a transfer. */
  stopFeeCents: number;
};

export const DEFAULT_PRICING_RULES: PricingRules = {
  vatBps: 600,
  nightSurchargeBps: 0,
  nightStartHour: 22,
  nightEndHour: 6,
  weekendSurchargeBps: 0,
  stopFeeCents: 0,
};

/** The company operates out of Brussels; all rules are evaluated in its time. */
export const COMPANY_TIME_ZONE = "Europe/Brussels";

export type PriceInput = {
  serviceType: ServiceType;
  rates: VehicleRates;
  /** Driven route distance in metres. Required for a transfer, ignored for a disposal. */
  distanceMeters?: number;
  /** Retained hours. Required for a disposal, ignored for a transfer. */
  durationHours?: number;
  /** Number of intermediate stops on a transfer. */
  stopCount?: number;
  /** Pickup date and time, used to evaluate the night and weekend windows. */
  scheduledAt?: Date;
  rules?: PricingRules;
};

export type PriceLine = {
  /** Stable key so the UI can translate the label itself. */
  key: "base" | "minimum_adjustment" | "night" | "weekend" | "stops";
  amountCents: number;
  /** Human-readable detail, e.g. "42.3 km x 3.00 EUR" — for the audit trail. */
  detail?: string;
};

export type PriceQuote = {
  serviceType: ServiceType;
  lines: PriceLine[];
  /** Fare before surcharges, after the minimum has been applied. */
  baseCents: number;
  /** True when the minimum fare, not the metered rate, set the base. */
  minimumApplied: boolean;
  htvaCents: number;
  vatBps: number;
  vatCents: number;
  ttcCents: number;
  /** Inputs echoed back, so a stored quote can always be re-explained. */
  distanceMeters: number;
  distanceKm: number;
  durationHours: number;
  stopCount: number;
};

/** Rounds half away from zero, so 2.5 -> 3 and -2.5 -> -3. */
function roundCents(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

function bps(amountCents: number, rateBps: number): number {
  return roundCents((amountCents * rateBps) / 10_000);
}

/**
 * Reads the wall-clock hour and weekday in Brussels, regardless of the time
 * zone the server happens to run in. Vercel runs in UTC; a naive
 * `date.getHours()` would put the night window an hour or two off for half
 * the year, quietly overcharging or undercharging clients.
 */
export function getBrusselsParts(date: Date): { hour: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: COMPANY_TIME_ZONE,
    hour: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(date);

  const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0";
  const weekdayPart = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return {
    // "24" is a legal ISO representation of midnight; normalise it to 0.
    hour: Number(hourPart) % 24,
    weekday: Math.max(0, weekdays.indexOf(weekdayPart)),
  };
}

export function isNightPickup(date: Date, rules: PricingRules): boolean {
  const { hour } = getBrusselsParts(date);
  const { nightStartHour: start, nightEndHour: end } = rules;
  // The window normally wraps midnight (22 -> 6), but must also handle a
  // same-day window (e.g. 1 -> 5) without matching the whole clock.
  return start > end ? hour >= start || hour < end : hour >= start && hour < end;
}

export function isWeekendPickup(date: Date): boolean {
  const { weekday } = getBrusselsParts(date);
  return weekday === 0 || weekday === 6;
}

/**
 * Produces a complete, itemised quote. Pure and synchronous: the same inputs
 * always yield the same price, which is what makes it testable and what lets
 * the server re-derive a price the client claims rather than trusting it.
 */
export function calculatePrice(input: PriceInput): PriceQuote {
  const rules = input.rules ?? DEFAULT_PRICING_RULES;
  const { rates, serviceType } = input;

  const distanceMeters = Math.max(0, Math.round(input.distanceMeters ?? 0));
  const distanceKm = distanceMeters / 1000;
  const durationHours = Math.max(0, Math.round(input.durationHours ?? 0));
  const stopCount = Math.max(0, Math.round(input.stopCount ?? 0));

  const lines: PriceLine[] = [];

  // 1. Metered fare
  let meteredCents: number;
  if (serviceType === "transfer") {
    meteredCents = roundCents(distanceKm * rates.pricePerKmCents);
    lines.push({
      key: "base",
      amountCents: meteredCents,
      detail: `${distanceKm.toFixed(1)} km x ${(rates.pricePerKmCents / 100).toFixed(2)} EUR/km`,
    });
  } else {
    meteredCents = roundCents(durationHours * rates.pricePerHourCents);
    lines.push({
      key: "base",
      amountCents: meteredCents,
      detail: `${durationHours} h x ${(rates.pricePerHourCents / 100).toFixed(2)} EUR/h`,
    });
  }

  // 2. Minimum fare floor
  const baseCents = Math.max(meteredCents, rates.minimumPriceCents);
  const minimumApplied = baseCents > meteredCents;
  if (minimumApplied) {
    lines.push({
      key: "minimum_adjustment",
      amountCents: baseCents - meteredCents,
      detail: `minimum ${(rates.minimumPriceCents / 100).toFixed(2)} EUR`,
    });
  }

  // 3. Surcharges, each computed against the floored base
  let surchargeCents = 0;

  if (input.scheduledAt && rules.nightSurchargeBps > 0 && isNightPickup(input.scheduledAt, rules)) {
    const amount = bps(baseCents, rules.nightSurchargeBps);
    surchargeCents += amount;
    lines.push({ key: "night", amountCents: amount, detail: `+${rules.nightSurchargeBps / 100}%` });
  }

  if (input.scheduledAt && rules.weekendSurchargeBps > 0 && isWeekendPickup(input.scheduledAt)) {
    const amount = bps(baseCents, rules.weekendSurchargeBps);
    surchargeCents += amount;
    lines.push({
      key: "weekend",
      amountCents: amount,
      detail: `+${rules.weekendSurchargeBps / 100}%`,
    });
  }

  if (serviceType === "transfer" && stopCount > 0 && rules.stopFeeCents > 0) {
    const amount = stopCount * rules.stopFeeCents;
    surchargeCents += amount;
    lines.push({
      key: "stops",
      amountCents: amount,
      detail: `${stopCount} x ${(rules.stopFeeCents / 100).toFixed(2)} EUR`,
    });
  }

  // 4. VAT last, on the full HTVA total
  const htvaCents = baseCents + surchargeCents;
  const vatCents = bps(htvaCents, rules.vatBps);

  return {
    serviceType,
    lines,
    baseCents,
    minimumApplied,
    htvaCents,
    vatBps: rules.vatBps,
    vatCents,
    ttcCents: htvaCents + vatCents,
    distanceMeters,
    distanceKm,
    durationHours,
    stopCount,
  };
}

/** Formats euro cents for display, e.g. 8000 -> "80,00 €" in French. */
export function formatCents(cents: number, locale: string = "fr-BE"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/** Splits a fare between the company and the driver, per the driver's rate. */
export function splitDriverEarnings(
  priceHtvaCents: number,
  commissionBps: number,
): { commissionCents: number; driverEarningsCents: number } {
  const commissionCents = bps(priceHtvaCents, commissionBps);
  return { commissionCents, driverEarningsCents: priceHtvaCents - commissionCents };
}
