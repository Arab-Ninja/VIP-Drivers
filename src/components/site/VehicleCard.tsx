import Link from "next/link";
import { Users, Briefcase, ArrowRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatCents } from "@/lib/pricing";
import type { Dictionary } from "@/i18n";
import type { FleetVehicle } from "@/server/fleet";
import { cn } from "@/lib/utils";

export function VehicleCard({
  vehicle,
  t,
  intl,
  href,
  className,
}: {
  vehicle: FleetVehicle;
  t: Dictionary;
  intl: string;
  href?: string;
  className?: string;
}) {
  const image = vehicle.imageUrls[0];

  return (
    <Card interactive className={cn("group flex flex-col overflow-hidden", className)}>
      <div className="relative aspect-[16/7] overflow-hidden bg-gradient-to-b from-ink-900 to-ink-950">
        {image ? (
          // Vehicle art is a flat SVG or an operator-supplied URL; plain <img>
          // keeps it simple and avoids optimising an already-tiny asset.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={vehicle.name}
            className="size-full object-contain transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : null}
        <span className="absolute left-4 top-4 border border-gold-600/50 bg-ink-950/80 px-2.5 py-1 text-[0.65rem] tracking-[0.2em] text-gold-300 backdrop-blur">
          {vehicle.year}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-2xl text-ink-100">{vehicle.name}</h3>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-300">
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5 text-gold-600" aria-hidden />
            {vehicle.passengerCapacity} {t.common.passengers.toLowerCase()}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Briefcase className="size-3.5 text-gold-600" aria-hidden />
            {vehicle.luggageCapacity} {t.common.luggage.toLowerCase()}
          </span>
        </div>

        <p className="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-300">
          {vehicle.description}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-ink-700 bg-ink-700">
          <div className="bg-ink-900 px-4 py-3">
            <dt className="text-[0.65rem] uppercase tracking-wider text-ink-400">
              {t.fleet.transferRate}
            </dt>
            <dd className="mt-1 font-display text-lg text-gold-300">
              {formatCents(vehicle.pricePerKmCents, intl)}
              <span className="ml-1 font-sans text-[0.7rem] text-ink-400">/{t.common.km}</span>
            </dd>
          </div>
          <div className="bg-ink-900 px-4 py-3">
            <dt className="text-[0.65rem] uppercase tracking-wider text-ink-400">
              {t.fleet.disposalRate}
            </dt>
            <dd className="mt-1 font-display text-lg text-gold-300">
              {formatCents(vehicle.pricePerHourCents, intl)}
              <span className="ml-1 font-sans text-[0.7rem] text-ink-400">
                /{t.common.hour.charAt(0)}
              </span>
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-[0.7rem] text-ink-400">
          {t.fleet.minimumRide} · {formatCents(vehicle.minimumPriceCents, intl)} {t.common.htva}
        </p>

        <Link
          href={href ?? `/booking?vehicle=${vehicle.slug}`}
          className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold-300 transition-colors hover:text-gold-100"
        >
          {t.fleet.bookThis}
          <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
    </Card>
  );
}
