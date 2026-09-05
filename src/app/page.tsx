import Link from "next/link";
import {
  ArrowRight,
  Route,
  Clock,
  ShieldCheck,
  BadgeEuro,
  UserCheck,
  Headphones,
  Check,
} from "lucide-react";

import { getTranslations } from "@/i18n";
import { getActiveFleet } from "@/server/fleet";
import { getCompanyInfo } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container, Section, SectionHeading } from "@/components/site/Section";
import { VehicleCard } from "@/components/site/VehicleCard";
import { formatCents } from "@/lib/pricing";

export default async function HomePage() {
  const { t, locale } = await getTranslations();
  const [fleet, company] = await Promise.all([getActiveFleet(locale), getCompanyInfo()]);
  const intl = t.meta.intl;

  const cheapest = fleet.length
    ? Math.min(...fleet.map((v) => v.minimumPriceCents))
    : null;

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="relative isolate overflow-hidden">
        {/* Layered black ground with a single warm pool of light behind the text */}
        <div className="absolute inset-0 -z-10 bg-ink-950" />
        <div
          className="absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(1100px 520px at 18% 22%, rgba(200,164,93,0.16), transparent 62%), radial-gradient(900px 480px at 88% 78%, rgba(184,147,62,0.10), transparent 60%)",
          }}
          aria-hidden
        />
        {/* Fine gold grid, barely visible, to give the black some texture */}
        <div
          className="absolute inset-0 -z-10 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(200,164,93,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(200,164,93,0.14) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 78%)",
          }}
          aria-hidden
        />

        <Container className="relative flex min-h-[calc(100dvh-5rem)] flex-col justify-center py-24">
          <div className="max-w-3xl animate-rise">
            <p className="eyebrow">{t.home.heroEyebrow}</p>
            <h1 className="mt-6 text-[2.6rem] leading-[1.06] text-ink-100 sm:text-6xl lg:text-7xl">
              {t.home.heroTitle.split(" ").slice(0, -1).join(" ")}{" "}
              <span className="text-gradient-gold">
                {t.home.heroTitle.split(" ").slice(-1)}
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-ink-300 sm:text-lg">
              {t.home.heroSubtitle}
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button asChild size="lg">
                <Link href="/booking">
                  {t.home.heroCta}
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/fleet">{t.home.heroSecondary}</Link>
              </Button>
            </div>

            {cheapest !== null ? (
              <p className="mt-8 text-xs tracking-wide text-ink-400">
                {t.common.from}{" "}
                <span className="text-gold-300">{formatCents(cheapest, intl)}</span>{" "}
                {t.common.htva} · {t.home.why2Title}
              </p>
            ) : null}
          </div>
        </Container>

        <div className="rule-gold" />
      </section>

      {/* ---------------- Services ---------------- */}
      <Section id="services">
        <SectionHeading
          eyebrow={t.nav.services}
          title={t.home.servicesTitle}
          subtitle={t.home.servicesSubtitle}
        />

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          {[
            {
              icon: Route,
              title: t.home.transferTitle,
              desc: t.home.transferDesc,
              points: [t.home.transferPoint1, t.home.transferPoint2, t.home.transferPoint3],
              href: "/booking?service=transfer",
            },
            {
              icon: Clock,
              title: t.home.disposalTitle,
              desc: t.home.disposalDesc,
              points: [t.home.disposalPoint1, t.home.disposalPoint2, t.home.disposalPoint3],
              href: "/booking?service=disposal",
            },
          ].map((service) => (
            <Card key={service.title} interactive className="group flex flex-col p-8 lg:p-10">
              <span className="grid size-12 place-items-center border border-gold-600/40 bg-gold-500/8 text-gold-300">
                <service.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-7 font-display text-3xl text-ink-100">{service.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-ink-300">{service.desc}</p>

              <ul className="mt-7 space-y-3">
                {service.points.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm text-ink-200">
                    <Check className="mt-0.5 size-4 shrink-0 text-gold-500" aria-hidden />
                    {point}
                  </li>
                ))}
              </ul>

              <Link
                href={service.href}
                className="mt-9 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold-300 transition-colors hover:text-gold-100"
              >
                {t.common.bookNow}
                <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Card>
          ))}
        </div>
      </Section>

      {/* ---------------- Fleet ---------------- */}
      <Section className="border-y border-ink-800 bg-ink-900/40">
        <SectionHeading
          eyebrow={t.nav.fleet}
          title={t.home.fleetTitle}
          subtitle={t.home.fleetSubtitle}
        />

        {fleet.length ? (
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {fleet.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} t={t} intl={intl} />
            ))}
          </div>
        ) : (
          <p className="mt-16 text-center text-sm text-ink-400">{t.fleet.empty}</p>
        )}

        <div className="mt-12 text-center">
          <Button asChild variant="outline">
            <Link href="/fleet">
              {t.home.fleetCta}
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </Section>

      {/* ---------------- Why ---------------- */}
      <Section>
        <SectionHeading
          eyebrow={t.common.brand}
          title={t.home.whyTitle}
          subtitle={t.home.whySubtitle}
        />

        <div className="mt-16 grid gap-px overflow-hidden rounded-lg border border-ink-700 bg-ink-700 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, title: t.home.why1Title, desc: t.home.why1Desc },
            { icon: BadgeEuro, title: t.home.why2Title, desc: t.home.why2Desc },
            { icon: UserCheck, title: t.home.why3Title, desc: t.home.why3Desc },
            { icon: Headphones, title: t.home.why4Title, desc: t.home.why4Desc },
          ].map((item) => (
            <div
              key={item.title}
              className="group bg-ink-900 p-8 transition-colors duration-500 hover:bg-ink-850"
            >
              <item.icon
                className="size-6 text-gold-500 transition-transform duration-500 group-hover:-translate-y-0.5"
                aria-hidden
              />
              <h3 className="mt-6 font-display text-xl text-ink-100">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">{item.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------------- Closing call to action ---------------- */}
      <section className="relative overflow-hidden border-t border-ink-800">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(760px 320px at 50% 0%, rgba(200,164,93,0.14), transparent 70%)",
          }}
          aria-hidden
        />
        <Container className="py-24 text-center lg:py-32">
          <h2 className="mx-auto max-w-2xl text-3xl leading-tight text-ink-100 sm:text-5xl">
            {t.home.ctaTitle}
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base text-ink-300">{t.home.ctaSubtitle}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/booking">
                {t.common.bookNow}
                <ArrowRight />
              </Link>
            </Button>
            <a
              href={`tel:${company.phone.replace(/\s/g, "")}`}
              className="text-sm tracking-wide text-ink-300 transition-colors hover:text-gold-300"
            >
              {company.phone}
            </a>
          </div>
        </Container>
      </section>
    </>
  );
}
