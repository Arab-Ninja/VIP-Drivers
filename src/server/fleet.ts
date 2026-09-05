import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { vehicleCategories, type VehicleCategory } from "@/db/schema";
import type { Locale } from "@/i18n";

export type FleetVehicle = VehicleCategory & {
  /** Description and features already resolved to the visitor's language. */
  description: string;
  features: string[];
};

function localise(vehicle: VehicleCategory, locale: Locale): FleetVehicle {
  return {
    ...vehicle,
    description: locale === "fr" ? vehicle.descriptionFr : vehicle.descriptionEn,
    features: locale === "fr" ? vehicle.featuresFr : vehicle.featuresEn,
  };
}

/** Vehicles shown to the public, in the operator's chosen order. */
export async function getActiveFleet(locale: Locale): Promise<FleetVehicle[]> {
  const rows = await db
    .select()
    .from(vehicleCategories)
    .where(eq(vehicleCategories.isActive, true))
    .orderBy(asc(vehicleCategories.sortOrder), asc(vehicleCategories.name));
  return rows.map((v) => localise(v, locale));
}

/** Every vehicle including hidden ones, for the admin panel. */
export async function getAllVehicles(): Promise<VehicleCategory[]> {
  return db
    .select()
    .from(vehicleCategories)
    .orderBy(asc(vehicleCategories.sortOrder), asc(vehicleCategories.name));
}

export async function getVehicleBySlug(
  slug: string,
  locale: Locale,
): Promise<FleetVehicle | null> {
  const [row] = await db
    .select()
    .from(vehicleCategories)
    .where(eq(vehicleCategories.slug, slug))
    .limit(1);
  return row ? localise(row, locale) : null;
}

export async function getVehicleById(id: string): Promise<VehicleCategory | null> {
  const [row] = await db
    .select()
    .from(vehicleCategories)
    .where(eq(vehicleCategories.id, id))
    .limit(1);
  return row ?? null;
}
