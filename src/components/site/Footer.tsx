import Link from "next/link";
import { Phone, Mail, MapPin, Instagram, Linkedin, Facebook } from "lucide-react";

import { Logo } from "@/components/Logo";
import type { Dictionary, Locale } from "@/i18n";
import type { CompanyInfo } from "@/lib/settings";

export function Footer({
  t,
  locale,
  company,
}: {
  t: Dictionary;
  locale: Locale;
  company: CompanyInfo;
}) {
  const socials = [
    { href: company.instagramUrl, icon: Instagram, label: "Instagram" },
    { href: company.linkedinUrl, icon: Linkedin, label: "LinkedIn" },
    { href: company.facebookUrl, icon: Facebook, label: "Facebook" },
  ].filter((s) => s.href);

  return (
    <footer className="border-t border-ink-800 bg-ink-950">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-ink-300">
              {locale === "fr" ? company.coverageFr : company.coverageEn}
            </p>
            {socials.length > 0 ? (
              <div className="mt-6 flex gap-3">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="grid size-9 place-items-center border border-ink-700 text-ink-300 transition-colors hover:border-gold-600/60 hover:text-gold-300"
                  >
                    <s.icon className="size-4" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <h4 className="eyebrow">{t.nav.menu}</h4>
            <ul className="mt-5 space-y-3 text-sm">
              {[
                { href: "/fleet", label: t.nav.fleet },
                { href: "/booking", label: t.nav.booking },
                { href: "/about", label: t.nav.about },
                { href: "/contact", label: t.nav.contact },
                { href: "/driver/apply", label: t.nav.becomeDriver },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-ink-300 transition-colors hover:text-gold-300">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="eyebrow">{t.footer.company}</h4>
            <ul className="mt-5 space-y-3 text-sm text-ink-300">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />
                <span>
                  {company.addressLine1}
                  {company.addressLine2 ? <>, {company.addressLine2}</> : null}
                  <br />
                  {company.postalCode} {company.city}, {company.country}
                </span>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />
                <a href={`tel:${company.phone.replace(/\s/g, "")}`} className="hover:text-gold-300">
                  {company.phone}
                </a>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />
                <a href={`mailto:${company.email}`} className="hover:text-gold-300">
                  {company.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 rule-gold" />

        <div className="mt-8 flex flex-col gap-4 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {company.legalName}. {t.footer.rights}
          </p>
          <p>
            {t.footer.vatLabel} {company.vatNumber}
          </p>
        </div>
      </div>
    </footer>
  );
}
