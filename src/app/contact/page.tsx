import type { Metadata } from "next";
import { Phone, Mail, MapPin } from "lucide-react";

import { getTranslations } from "@/i18n";
import { getCompanyInfo } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { Container, SectionHeading } from "@/components/site/Section";
import { ContactForm } from "@/components/site/ContactForm";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactez VIP Drivers à Bruxelles pour un devis, une réservation ou un partenariat.",
};

export default async function ContactPage() {
  const { t, locale } = await getTranslations();
  const [company, user] = await Promise.all([getCompanyInfo(), getCurrentUser()]);

  const cards = [
    {
      icon: Phone,
      title: t.contact.callUs,
      value: company.phone,
      href: `tel:${company.phone.replace(/\s/g, "")}`,
    },
    {
      icon: Mail,
      title: t.contact.writeUs,
      value: company.email,
      href: `mailto:${company.email}`,
    },
    {
      icon: MapPin,
      title: t.contact.visitUs,
      value: `${company.addressLine1}, ${company.postalCode} ${company.city}`,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${company.addressLine1} ${company.postalCode} ${company.city} ${company.country}`,
      )}`,
    },
  ];

  return (
    <>
      <Container className="py-16 lg:py-24">
        <SectionHeading
          eyebrow={t.nav.contact}
          title={t.contact.title}
          subtitle={t.contact.subtitle}
          align="left"
        />
      </Container>

      <Container className="pb-24">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ContactForm defaultEmail={user?.email ?? undefined} defaultName={user?.name ?? undefined} />
          </div>

          <div className="space-y-4 lg:col-span-2">
            {cards.map((card) => (
              <Card key={card.title} interactive className="p-6">
                <a
                  href={card.href}
                  target={card.href.startsWith("http") ? "_blank" : undefined}
                  rel={card.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="flex items-start gap-4"
                >
                  <span className="grid size-10 shrink-0 place-items-center border border-gold-600/40 bg-gold-500/8 text-gold-300">
                    <card.icon className="size-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block eyebrow">{card.title}</span>
                    <span className="mt-2 block text-sm text-ink-100">{card.value}</span>
                  </span>
                </a>
              </Card>
            ))}

            <Card className="p-6">
              <h3 className="eyebrow">{t.about.hours}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">
                {locale === "fr" ? company.hoursFr : company.hoursEn}
              </p>
            </Card>
          </div>
        </div>
      </Container>
    </>
  );
}
