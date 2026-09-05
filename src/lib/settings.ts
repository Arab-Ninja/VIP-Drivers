import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { DEFAULT_PRICING_RULES, type PricingRules } from "@/lib/pricing";

/* ------------------------------------------------------------------ */
/* Company information (admin-editable)                                */
/* ------------------------------------------------------------------ */

export type CompanyInfo = {
  legalName: string;
  tradingName: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  vatNumber: string;
  companyNumber: string;
  /** Free text, shown on the About page. */
  storyFr: string;
  storyEn: string;
  coverageFr: string;
  coverageEn: string;
  hoursFr: string;
  hoursEn: string;
  instagramUrl: string;
  linkedinUrl: string;
  facebookUrl: string;
};

export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  legalName: "VIP Drivers SRL",
  tradingName: "VIP Drivers",
  addressLine1: "Avenue Louise 143",
  addressLine2: "",
  postalCode: "1050",
  city: "Bruxelles",
  country: "Belgique",
  phone: "+32 2 000 00 00",
  email: "contact@vipdrivers.be",
  vatNumber: "BE 0000.000.000",
  companyNumber: "0000.000.000",
  storyFr:
    "VIP Drivers est une société de transport de personnes avec chauffeur basée à Bruxelles. Nous mettons à disposition de nos clients une flotte Mercedes-Benz récente et un réseau de chauffeurs partenaires professionnels, sélectionnés pour leur rigueur et leur sens du service. Transferts aéroport, déplacements d'affaires, mises à disposition à l'heure : chaque trajet est préparé en amont et exécuté avec la même exigence.",
  storyEn:
    "VIP Drivers is a chauffeur-driven passenger transport company based in Brussels. We offer our clients a recent Mercedes-Benz fleet and a network of professional partner chauffeurs, selected for their rigour and sense of service. Airport transfers, business travel, hourly hire: every journey is prepared in advance and delivered to the same standard.",
  coverageFr:
    "Bruxelles et l'ensemble du territoire belge. Transferts internationaux vers la France, les Pays-Bas, l'Allemagne et le Luxembourg sur demande.",
  coverageEn:
    "Brussels and all of Belgium. International transfers to France, the Netherlands, Germany and Luxembourg on request.",
  hoursFr: "7 jours sur 7, 24 heures sur 24. Réservation en ligne à toute heure.",
  hoursEn: "Seven days a week, around the clock. Online booking at any hour.",
  instagramUrl: "",
  linkedinUrl: "",
  facebookUrl: "",
};

/* ------------------------------------------------------------------ */
/* Operational settings                                                */
/* ------------------------------------------------------------------ */

export type OperationalSettings = {
  /** Commission applied to new drivers, in basis points. */
  defaultCommissionBps: number;
  /** Minimum hours between "now" and a bookable pickup. */
  minimumLeadTimeHours: number;
  /** Bounds offered in the disposal duration selector. */
  minDisposalHours: number;
  maxDisposalHours: number;
  /** Cap on intermediate stops per transfer. */
  maxStops: number;
};

export const DEFAULT_OPERATIONAL_SETTINGS: OperationalSettings = {
  defaultCommissionBps: 2000,
  minimumLeadTimeHours: 2,
  minDisposalHours: 1,
  maxDisposalHours: 12,
  maxStops: 5,
};

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export const SETTING_KEYS = {
  company: "company_info",
  pricing: "pricing_rules",
  operations: "operational_settings",
} as const;

async function readSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    if (!row) return fallback;
    // Merge over the defaults so a setting added in a later release is
    // populated for deployments whose stored row predates it.
    return { ...fallback, ...(row.value as object) } as T;
  } catch {
    // A settings read must never take a public page down.
    return fallback;
  }
}

export function getCompanyInfo(): Promise<CompanyInfo> {
  return readSetting(SETTING_KEYS.company, DEFAULT_COMPANY_INFO);
}

export function getPricingRules(): Promise<PricingRules> {
  return readSetting(SETTING_KEYS.pricing, DEFAULT_PRICING_RULES);
}

export function getOperationalSettings(): Promise<OperationalSettings> {
  return readSetting(SETTING_KEYS.operations, DEFAULT_OPERATIONAL_SETTINGS);
}

export async function writeSetting(key: string, value: unknown, userId?: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value, updatedBy: userId ?? null })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date(), updatedBy: userId ?? null },
    });
}
