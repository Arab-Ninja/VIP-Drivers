import type { Metadata } from "next";
import { Building2, Globe2, CreditCard, Clock, ShieldCheck, Gem, Sparkles } from "lucide-react";

import { getTranslations } from "@/i18n";
import { getCompanyInfo } from "@/lib/settings";
import { env } from "@/lib/env";
import { Container, SectionHeading } from "@/components/site/Section";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "VIP Drivers, société de transport de personnes avec chauffeur basée à Bruxelles. Informations légales, zone de couverture et moyens de paiement.",
};

export default async function AboutPage() {
  const { t, locale } = await getTranslations();
  const company = await getCompanyInfo();

  const story = locale === "fr" ? company.storyFr : company.storyEn;
  const coverage = locale === "fr" ? company.coverageFr : company.coverageEn;
  const hours = locale === "fr" ? company.hoursFr : company.hoursEn;

  const paymentMethods = [
    "Visa",
    "Mastercard",
    "American Express",
    "Apple Pay",
    "Google Pay",
    ...(env.paypal.enabled ? ["PayPal"] : []),
  ];

  const values = [
    {
      icon: ShieldCheck,
      title: locale === "fr" ? "Sécurité et conformité" : "Safety and compliance",
      body:
        locale === "fr"
          ? "Véhicules assurés en transport rémunéré de personnes, entretenus selon le carnet constructeur et contrôlés régulièrement."
          : "Vehicles insured for paid passenger transport, serviced to the manufacturer's schedule and inspected regularly.",
    },
    {
      icon: Gem,
      title: locale === "fr" ? "Discrétion" : "Discretion",
      body:
        locale === "fr"
          ? "Ce qui se dit dans la voiture reste dans la voiture. Nos chauffeurs sont formés à la confidentialité qu'exige une clientèle d'affaires."
          : "What is said in the car stays in the car. Our chauffeurs are trained in the confidentiality a business clientele requires.",
    },
    {
      icon: Sparkles,
      title: locale === "fr" ? "Présentation irréprochable" : "Impeccable presentation",
      body:
        locale === "fr"
          ? "Véhicule nettoyé avant chaque prise en charge, tenue soignée, accueil avec pancarte nominative sur demande."
          : "The car is cleaned before every pickup, dress is formal, and a name board welcome is available on request.",
    },
  ];

  return (
    <>
      <Container className="py-16 lg:py-24">
        <SectionHeading
          eyebrow={company.tradingName}
          title={t.about.title}
          subtitle={t.about.subtitle}
          align="left"
        />
      </Container>

      <Container className="pb-20">
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="font-display text-2xl text-ink-100">{t.about.storyTitle}</h2>
            <p className="mt-6 whitespace-pre-line text-sm leading-[1.9] text-ink-300">{story}</p>

            <h2 className="mt-14 font-display text-2xl text-ink-100">{t.about.valuesTitle}</h2>
            <div className="mt-6 space-y-4">
              {values.map((value) => (
                <Card key={value.title} className="flex gap-5 p-6">
                  <span className="grid size-10 shrink-0 place-items-center border border-gold-600/40 bg-gold-500/8 text-gold-300">
                    <value.icon className="size-4" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-base text-ink-100">{value.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-300">{value.body}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <Card className="p-6">
              <h3 className="flex items-center gap-2 eyebrow">
                <Building2 className="size-3.5" aria-hidden />
                {t.about.companyDetails}
              </h3>
              <dl className="mt-5 space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-ink-400">{t.about.companyDetails}</dt>
                  <dd className="mt-0.5 text-ink-100">{company.legalName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-400">Adresse</dt>
                  <dd className="mt-0.5 text-ink-100">
                    {company.addressLine1}
                    {company.addressLine2 ? <>, {company.addressLine2}</> : null}
                    <br />
                    {company.postalCode} {company.city}
                    <br />
                    {company.country}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-400">{t.footer.vatLabel}</dt>
                  <dd className="mt-0.5 text-ink-100">{company.vatNumber}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-400">{t.contact.phone}</dt>
                  <dd className="mt-0.5">
                    <a
                      href={`tel:${company.phone.replace(/\s/g, "")}`}
                      className="text-gold-300 hover:text-gold-200"
                    >
                      {company.phone}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-400">{t.contact.email}</dt>
                  <dd className="mt-0.5">
                    <a href={`mailto:${company.email}`} className="text-gold-300 hover:text-gold-200">
                      {company.email}
                    </a>
                  </dd>
                </div>
              </dl>
            </Card>

            <Card className="p-6">
              <h3 className="flex items-center gap-2 eyebrow">
                <Globe2 className="size-3.5" aria-hidden />
                {t.about.coverage}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-ink-300">{coverage}</p>
            </Card>

            <Card className="p-6">
              <h3 className="flex items-center gap-2 eyebrow">
                <Clock className="size-3.5" aria-hidden />
                {t.about.hours}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-ink-300">{hours}</p>
            </Card>

            <Card className="p-6">
              <h3 className="flex items-center gap-2 eyebrow">
                <CreditCard className="size-3.5" aria-hidden />
                {t.about.payment}
              </h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {paymentMethods.map((method) => (
                  <li
                    key={method}
                    className="border border-ink-700 bg-ink-850 px-2.5 py-1 text-xs text-ink-200"
                  >
                    {method}
                  </li>
                ))}
              </ul>
            </Card>
          </aside>
        </div>
      </Container>
    </>
  );
}
