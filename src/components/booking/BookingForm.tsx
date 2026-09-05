"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Route,
  Clock,
  Plus,
  Trash2,
  Users,
  Briefcase,
  Plane,
  ArrowRight,
  Loader2,
  ChevronUp,
} from "lucide-react";

import { AddressInput, type AddressValue } from "@/components/booking/AddressInput";
import { PriceSummary, type RouteInfo } from "@/components/booking/PriceSummary";
import { Button } from "@/components/ui/button";
import { FormField, Input, Textarea, Select } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { useI18n, fill } from "@/i18n/client";
import { formatCents, type PriceQuote } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { createBooking } from "@/app/actions/booking";
import type { ServiceType } from "@/db/schema";

export type BookingVehicle = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  passengerCapacity: number;
  luggageCapacity: number;
  pricePerKmCents: number;
  pricePerHourCents: number;
  minimumPriceCents: number;
};

export type BookingFormProps = {
  vehicles: BookingVehicle[];
  defaults: {
    serviceType: ServiceType;
    vehicleSlug: string | null;
  };
  limits: {
    minimumLeadTimeHours: number;
    minDisposalHours: number;
    maxDisposalHours: number;
    maxStops: number;
  };
  user: { name: string | null; email: string | null; phone: string | null } | null;
};

type Stop = { key: string; value: AddressValue };

/** Local datetime string for <input type="datetime-local">, no seconds. */
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function BookingForm({ vehicles, defaults, limits, user }: BookingFormProps) {
  const { t, intl } = useI18n();
  const router = useRouter();

  const [serviceType, setServiceType] = useState<ServiceType>(defaults.serviceType);
  const [pickup, setPickup] = useState<AddressValue>(null);
  const [dropoff, setDropoff] = useState<AddressValue>(null);
  const [stops, setStops] = useState<Stop[]>([]);

  const earliest = useMemo(() => {
    const d = new Date(Date.now() + limits.minimumLeadTimeHours * 3600_000);
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    return d;
  }, [limits.minimumLeadTimeHours]);

  const [scheduledAt, setScheduledAt] = useState(() => toLocalInputValue(earliest));
  const [durationHours, setDurationHours] = useState(3);

  const [vehicleSlug, setVehicleSlug] = useState(
    defaults.vehicleSlug && vehicles.some((v) => v.slug === defaults.vehicleSlug)
      ? defaults.vehicleSlug
      : (vehicles[0]?.slug ?? ""),
  );

  const [passengers, setPassengers] = useState(1);
  const [luggage, setLuggage] = useState(1);
  const [flightNumber, setFlightNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [contactName, setContactName] = useState(user?.name ?? "");
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [contactPhone, setContactPhone] = useState(user?.phone ?? "");

  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  const selectedVehicle = vehicles.find((v) => v.slug === vehicleSlug) ?? null;

  /* ---------------- live pricing ---------------- */

  // A disposal starts and ends somewhere but is billed on time alone, so it
  // only needs a pickup to be priceable.
  const readyForQuote =
    Boolean(pickup) &&
    Boolean(vehicleSlug) &&
    Boolean(scheduledAt) &&
    (serviceType === "transfer" ? Boolean(dropoff) : durationHours > 0);

  const quoteSeq = useRef(0);

  const fetchQuote = useCallback(async () => {
    if (!readyForQuote || !pickup) {
      setQuote(null);
      setRoute(null);
      return;
    }

    const seq = ++quoteSeq.current;
    setQuoteLoading(true);
    setQuoteError(null);

    // A disposal returns to its starting point unless the client says
    // otherwise, which is what "begins at A, ends at B" means in practice.
    const end = serviceType === "transfer" ? dropoff! : (dropoff ?? pickup);

    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType,
          vehicleSlug,
          pickup,
          dropoff: end,
          stops: serviceType === "transfer" ? stops.flatMap((s) => (s.value ? [s.value] : [])) : [],
          scheduledAt: new Date(scheduledAt).toISOString(),
          durationHours: serviceType === "disposal" ? durationHours : undefined,
        }),
      });

      if (seq !== quoteSeq.current) return;

      const data = await response.json();
      if (!response.ok) {
        setQuote(null);
        setRoute(null);
        setQuoteError(
          data?.error === "lead_time"
            ? t.booking.minLeadTime
            : data?.error === "past_date"
              ? t.booking.pastDate
              : t.booking.routeError,
        );
        return;
      }

      setQuote(data.quote as PriceQuote);
      setRoute(data.route as RouteInfo);
    } catch {
      if (seq === quoteSeq.current) {
        setQuote(null);
        setQuoteError(t.booking.routeError);
      }
    } finally {
      if (seq === quoteSeq.current) setQuoteLoading(false);
    }
  }, [
    readyForQuote,
    pickup,
    dropoff,
    stops,
    serviceType,
    vehicleSlug,
    scheduledAt,
    durationHours,
    t,
  ]);

  // Re-price on every meaningful change, lightly debounced so dragging the
  // duration slider does not fire a request per step.
  useEffect(() => {
    const timer = setTimeout(fetchQuote, 250);
    return () => clearTimeout(timer);
  }, [fetchQuote]);

  /* ---------------- stops ---------------- */

  function addStop() {
    if (stops.length >= limits.maxStops) return;
    setStops((current) => [...current, { key: crypto.randomUUID(), value: null }]);
  }

  function updateStop(key: string, value: AddressValue) {
    setStops((current) => current.map((s) => (s.key === key ? { ...s, value } : s)));
  }

  function removeStop(key: string) {
    setStops((current) => current.filter((s) => s.key !== key));
  }

  /* ---------------- submit ---------------- */

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quote || !pickup || submitting) return;

    setSubmitting(true);
    const end = serviceType === "transfer" ? dropoff! : (dropoff ?? pickup);

    try {
      const result = await createBooking({
        serviceType,
        vehicleSlug,
        pickup,
        dropoff: end,
        stops: serviceType === "transfer" ? stops.flatMap((s) => (s.value ? [s.value] : [])) : [],
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationHours: serviceType === "disposal" ? durationHours : undefined,
        passengers,
        luggage,
        flightNumber: flightNumber || undefined,
        notes: notes || undefined,
        contactName,
        contactEmail,
        contactPhone,
      });

      if (!result.ok) {
        if (result.error === "unauthenticated") {
          toast.error(t.booking.mustLogin);
          router.push(`/login?callbackUrl=${encodeURIComponent("/booking")}`);
          return;
        }
        toast.error(
          result.error === "lead_time"
            ? t.booking.minLeadTime
            : result.error === "past_date"
              ? t.booking.pastDate
              : t.common.errorTitle,
        );
        return;
      }

      router.push(`/booking/${result.reference}`);
    } finally {
      setSubmitting(false);
    }
  }

  const durationOptions = Array.from(
    { length: limits.maxDisposalHours - limits.minDisposalHours + 1 },
    (_, i) => limits.minDisposalHours + i,
  );

  const hint =
    quoteError ??
    (serviceType === "disposal" && !pickup
      ? t.booking.fillAddresses
      : serviceType === "disposal"
        ? t.booking.fillDuration
        : t.booking.fillAddresses);

  const canSubmit = Boolean(quote) && !quoteLoading && !submitting;

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
      {/* ------------------ left: the options ------------------ */}
      <div className="space-y-6">
        {/* Service */}
        <Card className="p-6 lg:p-7">
          <h2 className="eyebrow">{t.booking.step1}</h2>
          <p className="mt-3 text-sm text-ink-200">{t.booking.serviceQuestion}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(
              [
                { value: "transfer", icon: Route, label: t.booking.transfer, hint: t.booking.transferHint },
                { value: "disposal", icon: Clock, label: t.booking.disposal, hint: t.booking.disposalHint },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setServiceType(option.value)}
                aria-pressed={serviceType === option.value}
                className={cn(
                  "flex items-start gap-3 rounded-sm border p-4 text-left transition-all duration-300",
                  serviceType === option.value
                    ? "border-gold-500/70 bg-gold-500/8 shadow-gold"
                    : "border-ink-700 bg-ink-900 hover:border-ink-600",
                )}
              >
                <option.icon
                  className={cn(
                    "mt-0.5 size-5 shrink-0",
                    serviceType === option.value ? "text-gold-300" : "text-ink-400",
                  )}
                  aria-hidden
                />
                <span>
                  <span className="block text-sm text-ink-100">{option.label}</span>
                  <span className="mt-1 block text-xs text-ink-400">{option.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* Itinerary */}
        <Card className="p-6 lg:p-7">
          <h2 className="eyebrow">{t.booking.step2}</h2>

          <div className="mt-5 space-y-4">
            <AddressInput
              label={t.booking.pickup}
              placeholder={t.booking.pickupPlaceholder}
              value={pickup}
              onChange={setPickup}
              onClear={() => setPickup(null)}
              required
            />

            {serviceType === "transfer"
              ? stops.map((stop, index) => (
                  <div key={stop.key} className="flex items-end gap-2">
                    <AddressInput
                      className="flex-1"
                      label={`${t.booking.stop} ${index + 1}`}
                      placeholder={t.booking.pickupPlaceholder}
                      value={stop.value}
                      onChange={(value) => updateStop(stop.key, value)}
                      onClear={() => updateStop(stop.key, null)}
                    />
                    <Button
                      type="button"
                      variant="subtle"
                      size="icon"
                      aria-label={t.booking.removeStop}
                      onClick={() => removeStop(stop.key)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))
              : null}

            <AddressInput
              label={t.booking.dropoff}
              placeholder={t.booking.dropoffPlaceholder}
              value={dropoff}
              onChange={setDropoff}
              onClear={() => setDropoff(null)}
              required={serviceType === "transfer"}
            />

            {serviceType === "transfer" && stops.length < limits.maxStops ? (
              <Button type="button" variant="link" size="sm" onClick={addStop}>
                <Plus />
                {t.booking.addStop}
              </Button>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <FormField label={t.booking.datetime} htmlFor="scheduledAt">
              <Input
                id="scheduledAt"
                type="datetime-local"
                required
                value={scheduledAt}
                min={toLocalInputValue(earliest)}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            </FormField>

            {serviceType === "disposal" ? (
              <FormField label={t.booking.duration} htmlFor="durationHours">
                <Select
                  id="durationHours"
                  value={durationHours}
                  onChange={(event) => setDurationHours(Number(event.target.value))}
                >
                  {durationOptions.map((hours) => (
                    <option key={hours} value={hours}>
                      {fill(t.booking.durationHours, { n: hours })}
                    </option>
                  ))}
                </Select>
              </FormField>
            ) : null}
          </div>
        </Card>

        {/* Vehicle */}
        <Card className="p-6 lg:p-7">
          <h2 className="eyebrow">{t.booking.step3}</h2>
          <p className="mt-3 text-sm text-ink-200">{t.booking.chooseVehicle}</p>

          <div className="mt-5 space-y-3">
            {vehicles.map((vehicle) => {
              const selected = vehicle.slug === vehicleSlug;
              const rate =
                serviceType === "transfer"
                  ? `${formatCents(vehicle.pricePerKmCents, intl)}/${t.common.km}`
                  : `${formatCents(vehicle.pricePerHourCents, intl)}/${t.common.hour.charAt(0)}`;
              const tooSmall = vehicle.passengerCapacity < passengers;

              return (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => setVehicleSlug(vehicle.slug)}
                  aria-pressed={selected}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-sm border p-3 text-left transition-all duration-300",
                    selected
                      ? "border-gold-500/70 bg-gold-500/8"
                      : "border-ink-700 bg-ink-900 hover:border-ink-600",
                    tooSmall && "opacity-55",
                  )}
                >
                  {vehicle.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={vehicle.imageUrl} alt="" className="h-12 w-24 shrink-0 object-contain" />
                  ) : null}

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink-100">{vehicle.name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3" aria-hidden />
                        {vehicle.passengerCapacity}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="size-3" aria-hidden />
                        {vehicle.luggageCapacity}
                      </span>
                      {tooSmall ? (
                        <span className="text-warning">
                          {t.common.passengers} &gt; {vehicle.passengerCapacity}
                        </span>
                      ) : null}
                    </span>
                  </span>

                  <span className="shrink-0 text-right">
                    <span className={cn("block text-sm", selected ? "text-gold-300" : "text-ink-200")}>
                      {rate}
                    </span>
                    <span className="mt-0.5 block text-[0.65rem] text-ink-500">
                      {t.common.minimum} {formatCents(vehicle.minimumPriceCents, intl)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Passenger details */}
        <Card className="p-6 lg:p-7">
          <h2 className="eyebrow">{t.booking.step4}</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <FormField label={t.common.passengers} htmlFor="passengers">
              <Select
                id="passengers"
                value={passengers}
                onChange={(event) => setPassengers(Number(event.target.value))}
              >
                {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label={t.common.luggage} htmlFor="luggage">
              <Select
                id="luggage"
                value={luggage}
                onChange={(event) => setLuggage(Number(event.target.value))}
              >
                {Array.from({ length: 9 }, (_, i) => i).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label={t.booking.contactName} htmlFor="contactName">
              <Input
                id="contactName"
                required
                minLength={2}
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                autoComplete="name"
              />
            </FormField>

            <FormField label={t.booking.contactPhone} htmlFor="contactPhone">
              <Input
                id="contactPhone"
                type="tel"
                required
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                autoComplete="tel"
                placeholder="+32 4.. .. .. .."
              />
            </FormField>

            <FormField label={t.booking.contactEmail} htmlFor="contactEmail" className="sm:col-span-2">
              <Input
                id="contactEmail"
                type="email"
                required
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                autoComplete="email"
              />
            </FormField>

            <FormField
              label={t.booking.flightNumber}
              hint={t.common.optional}
              htmlFor="flightNumber"
              className="sm:col-span-2"
            >
              <div className="relative">
                <Plane
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
                  aria-hidden
                />
                <Input
                  id="flightNumber"
                  className="pl-9"
                  value={flightNumber}
                  onChange={(event) => setFlightNumber(event.target.value.toUpperCase())}
                  placeholder="SN2104"
                />
              </div>
              <p className="mt-1.5 text-[0.7rem] text-ink-500">{t.booking.flightHint}</p>
            </FormField>

            <FormField
              label={t.booking.notes}
              hint={t.common.optional}
              htmlFor="notes"
              className="sm:col-span-2"
            >
              <Textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={t.booking.notesHint}
              />
            </FormField>
          </div>
        </Card>
      </div>

      {/* ------------------ right: the live preview ------------------ */}
      <aside className="lg:sticky lg:top-24">
        {/* Desktop panel */}
        <Card className="hidden p-6 lg:block">
          <h2 className="font-display text-2xl text-ink-100">{t.booking.summary}</h2>
          <p className="mt-1.5 text-xs text-ink-400">{t.booking.summaryHint}</p>

          {selectedVehicle ? (
            <div className="mt-5 flex items-center gap-3 border-y border-ink-700 py-3">
              {selectedVehicle.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedVehicle.imageUrl} alt="" className="h-10 w-20 object-contain" />
              ) : null}
              <span className="text-sm text-ink-200">{selectedVehicle.name}</span>
            </div>
          ) : null}

          <PriceSummary
            className="mt-5"
            quote={quote}
            route={route}
            loading={quoteLoading}
            hint={hint}
          />

          <Button type="submit" className="mt-6 w-full" size="lg" disabled={!canSubmit}>
            {submitting ? <Loader2 className="animate-spin" /> : null}
            {submitting ? t.common.loading : t.booking.confirmBooking}
            {!submitting ? <ArrowRight /> : null}
          </Button>
        </Card>

        {/* Mobile: a bottom bar that expands into the same summary */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-700 bg-ink-950/97 backdrop-blur-xl lg:hidden">
          {mobileSummaryOpen ? (
            <div className="max-h-[55dvh] overflow-y-auto border-b border-ink-800 px-5 py-5">
              <PriceSummary quote={quote} route={route} loading={quoteLoading} hint={hint} />
            </div>
          ) : null}

          <div className="flex items-center gap-3 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => setMobileSummaryOpen((v) => !v)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              aria-expanded={mobileSummaryOpen}
            >
              <ChevronUp
                className={cn(
                  "size-4 shrink-0 text-ink-400 transition-transform duration-300",
                  mobileSummaryOpen && "rotate-180",
                )}
                aria-hidden
              />
              <span className="min-w-0">
                <span className="block text-[0.65rem] uppercase tracking-wider text-ink-400">
                  {t.common.total} {t.common.tvac}
                </span>
                <span className="block truncate font-display text-xl text-gradient-gold">
                  {quote ? formatCents(quote.ttcCents, intl) : "—"}
                </span>
              </span>
            </button>

            <Button type="submit" disabled={!canSubmit} className="shrink-0">
              {submitting ? <Loader2 className="animate-spin" /> : null}
              {t.common.confirm}
            </Button>
          </div>
        </div>
        {/* Keeps the last form card clear of the fixed mobile bar. */}
        <div className="h-24 lg:hidden" aria-hidden />
      </aside>
    </form>
  );
}
