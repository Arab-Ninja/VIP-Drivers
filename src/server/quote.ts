import "server-only";
import { z } from "zod";

import { getVehicleById, getVehicleBySlug } from "@/server/fleet";
import { getPricingRules, getOperationalSettings } from "@/lib/settings";
import { calculatePrice, type PriceQuote } from "@/lib/pricing";
import { calculateRoute, type RouteResult } from "@/server/routing";
import type { VehicleCategory } from "@/db/schema";

/**
 * The single place a price is produced.
 *
 * Both the live preview endpoint and the booking creation path call this, so
 * the figure a client sees is by construction the figure they are charged.
 * Nothing about the price is ever taken from the request body: the client
 * sends the itinerary, the server measures it and applies its own rates.
 */

const pointSchema = z.object({
  address: z.string().trim().min(1).max(400),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const quoteRequestSchema = z
  .object({
    serviceType: z.enum(["transfer", "disposal"]),
    /** Either identifier is accepted; slug is what the public URLs carry. */
    vehicleId: z.string().min(1).optional(),
    vehicleSlug: z.string().min(1).optional(),
    pickup: pointSchema,
    dropoff: pointSchema,
    stops: z.array(pointSchema).max(10).default([]),
    /** ISO 8601 pickup instant. */
    scheduledAt: z.string().datetime({ offset: true }),
    durationHours: z.number().int().min(1).max(24).optional(),
  })
  .refine((v) => v.vehicleId || v.vehicleSlug, { message: "vehicle_required" })
  .refine((v) => v.serviceType !== "disposal" || v.durationHours, {
    message: "duration_required",
  });

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

export type QuoteResult = {
  quote: PriceQuote;
  route: RouteResult;
  vehicle: VehicleCategory;
  scheduledAt: Date;
};

export type QuoteError =
  | "vehicle_not_found"
  | "vehicle_unavailable"
  | "duration_required"
  | "duration_out_of_range"
  | "past_date"
  | "lead_time";

export async function buildQuote(
  input: QuoteRequest,
): Promise<{ ok: true; data: QuoteResult } | { ok: false; error: QuoteError }> {
  const vehicle = input.vehicleId
    ? await getVehicleById(input.vehicleId)
    : await getVehicleBySlug(input.vehicleSlug!, "fr");

  if (!vehicle) return { ok: false, error: "vehicle_not_found" };
  if (!vehicle.isActive) return { ok: false, error: "vehicle_unavailable" };

  const [rules, operations] = await Promise.all([getPricingRules(), getOperationalSettings()]);

  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return { ok: false, error: "past_date" };

  const leadMs = operations.minimumLeadTimeHours * 60 * 60 * 1000;
  if (scheduledAt.getTime() < Date.now()) return { ok: false, error: "past_date" };
  if (scheduledAt.getTime() < Date.now() + leadMs) return { ok: false, error: "lead_time" };

  if (input.serviceType === "disposal") {
    const hours = input.durationHours;
    if (!hours) return { ok: false, error: "duration_required" };
    if (hours < operations.minDisposalHours || hours > operations.maxDisposalHours) {
      return { ok: false, error: "duration_out_of_range" };
    }
  }

  const stops = input.stops.slice(0, operations.maxStops);

  // A disposal is billed on time alone, so its route is not measured. The
  // journey still has a start and an end address for the driver's benefit.
  const route: RouteResult =
    input.serviceType === "transfer"
      ? await calculateRoute([input.pickup, ...stops, input.dropoff])
      : { distanceMeters: 0, durationSeconds: 0, provider: "haversine", estimated: false };

  const quote = calculatePrice({
    serviceType: input.serviceType,
    rates: vehicle,
    distanceMeters: route.distanceMeters,
    durationHours: input.durationHours,
    stopCount: stops.length,
    scheduledAt,
    rules,
  });

  return { ok: true, data: { quote, route, vehicle, scheduledAt } };
}
