import type { Metadata } from "next";
import { Check } from "lucide-react";

import { getTranslations } from "@/i18n";
import { getActiveFleet } from "@/server/fleet";
import { Container, SectionHeading } from "@/components/site/Section";
import { formatCents } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Flotte",
  description:
    "Mercedes-Benz Classe E, Classe V et Classe S, millésime 2026. Tarifs au kilomètre et à l'heure, minimum par trajet.",
};

export default async function FleetPage() {
  const { t, locale } = await getTranslations();
  const fleet = await getActiveFleet(locale);
  const intl = t.meta.intl;

  return (
    <>
      <Container className="py-16 lg:py-24">
        <SectionHeading
          eyebrow={t.common.brand}
          title={t.fleet.title}
          subtitle={t.fleet.subtitle}
          align="left"
        />
      </Container>

      <Container className="pb-24">
        {fleet.length === 0 ? (
          <p className="text-sm text-ink-400">{t.fleet.empty}</p>
        ) : (
          <div className="space-y-8">
            {fleet.map((vehicle, index) => (
              <article
                key={vehicle.id}
                className="surface surface-hover grid overflow-hidden rounded-lg lg:grid-cols-2"
              >
                <div
                  className={
                    "relative flex items-center justify-center bg-gradient-to-br from-ink-850 to-ink-950 p-8 " +
                    (index % 2 === 1 ? "lg:order-2" : "")
                  }
                >
                  {vehicle.imageUrls[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={vehicle.imageUrls[0]}
                      alt={vehicle.name}
                      className="w-full max-w-lg"
                      loading={index === 0 ? "eager" : "lazy"}
                    />
                  ) : null}
                  <span className="absolute left-6 top-6 border border-gold-600/50 bg-ink-950/80 px-3 py-1 text-[0.65rem] tracking-[0.2em] text-gold-300">
                    {vehicle.year}
                  </span>
                </div>

                <div className="p-8 lg:p-12">
                  <h2 className="font-display text-3xl text-ink-100 lg:text-4xl">{vehicle.name}</h2>
                  <p className="mt-5 text-sm leading-relaxed text-ink-300">{vehicle.description}</p>

                  <div className="mt-8">
                    <h3 className="eyebrow">{t.fleet.capacity}</h3>
                    <p className="mt-3 text-sm text-ink-200">
                      {t.fleet.passengersUpTo.replace("{n}", String(vehicle.passengerCapacity))} ·{" "}
                      {t.fleet.luggageUpTo.replace("{n}", String(vehicle.luggageCapacity))}
                    </p>
                  </div>

                  {vehicle.features.length ? (
                    <div className="mt-8">
                      <h3 className="eyebrow">{t.fleet.equipment}</h3>
                      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                        {vehicle.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2.5 text-sm text-ink-200">
                            <Check className="mt-0.5 size-3.5 shrink-0 text-gold-500" aria-hidden />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="mt-8">
                    <h3 className="eyebrow">{t.fleet.pricing}</h3>
                    <dl className="mt-4 divide-y divide-ink-700/70 border-y border-ink-700/70">
                      <div className="flex items-baseline justify-between py-3">
                        <dt className="text-sm text-ink-300">{t.fleet.transferRate}</dt>
                        <dd className="font-display text-xl text-gold-300">
                          {formatCents(vehicle.pricePerKmCents, intl)}
                          <span className="ml-1 font-sans text-xs text-ink-400">
                            /{t.common.km} {t.common.htva}
                          </span>
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between py-3">
                        <dt className="text-sm text-ink-300">{t.fleet.disposalRate}</dt>
                        <dd className="font-display text-xl text-gold-300">
                          {formatCents(vehicle.pricePerHourCents, intl)}
                          <span className="ml-1 font-sans text-xs text-ink-400">
                            /{t.common.hour.charAt(0)} {t.common.htva}
                          </span>
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between py-3">
                        <dt className="text-sm text-ink-300">{t.fleet.minimumRide}</dt>
                        <dd className="text-sm text-ink-100">
                          {formatCents(vehicle.minimumPriceCents, intl)} {t.common.htva}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <a
                    href={`/booking?vehicle=${vehicle.slug}`}
                    className="mt-8 inline-flex h-11 items-center justify-center rounded-sm bg-gradient-to-b from-gold-300 to-gold-500 px-7 text-sm font-medium tracking-wide text-ink-950 transition-all hover:from-gold-200 hover:to-gold-400"
                  >
                    {t.fleet.bookThis}
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
