import "server-only";
import { env } from "@/lib/env";

/**
 * Address search and driven-distance calculation.
 *
 * Three tiers, best available first:
 *
 *   1. Mapbox        used whenever MAPBOX_TOKEN is set. Best Belgian address
 *                    coverage and traffic-free driving distances.
 *   2. Nominatim +   keyless OpenStreetMap services. Real addresses and real
 *      OSRM          driven routes with nothing to configure, which is what
 *                    lets the app work the moment it is deployed. Both are
 *                    community-run with published rate limits, so they are
 *                    for evaluation rather than production traffic.
 *   3. Haversine     straight-line distance with a road-network factor. The
 *                    last resort when every network call fails; results are
 *                    flagged `estimated` so the UI can say so.
 *
 * The Mapbox token never reaches the browser: the client talks to our own
 * /api/geo routes and this module makes the upstream calls.
 */

export type GeoPlace = {
  id: string;
  /** Short label, e.g. "Avenue Louise 143". */
  name: string;
  /** Full one-line address shown in the results list. */
  fullAddress: string;
  lat: number;
  lng: number;
};

export type LatLng = { lat: number; lng: number };

export type RouteResult = {
  distanceMeters: number;
  durationSeconds: number;
  provider: "mapbox" | "osrm" | "haversine";
  /** True when the distance is approximated rather than routed. */
  estimated: boolean;
};

const USER_AGENT = "VIPDrivers/2.0 (+https://github.com/Arab-Ninja/VIP-Drivers)";
const FETCH_TIMEOUT_MS = 8000;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...init?.headers },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Address search                                                      */
/* ------------------------------------------------------------------ */

/** Short-lived cache: autocomplete re-queries the same prefixes constantly. */
const searchCache = new Map<string, { at: number; results: GeoPlace[] }>();
const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
const SEARCH_CACHE_MAX = 500;

function readCache(key: string): GeoPlace[] | null {
  const hit = searchCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > SEARCH_CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return hit.results;
}

function writeCache(key: string, results: GeoPlace[]) {
  if (searchCache.size >= SEARCH_CACHE_MAX) {
    // Cheap eviction: drop the oldest inserted key.
    const oldest = searchCache.keys().next().value;
    if (oldest) searchCache.delete(oldest);
  }
  searchCache.set(key, { at: Date.now(), results });
}

/**
 * Nominatim's usage policy allows at most one request per second. Requests
 * are queued behind this promise chain so a burst of keystrokes cannot breach
 * it, however impatient the typist.
 */
let nominatimChain: Promise<unknown> = Promise.resolve();
const NOMINATIM_MIN_INTERVAL_MS = 1100;
let lastNominatimAt = 0;

function throttleNominatim<T>(task: () => Promise<T>): Promise<T> {
  const run = nominatimChain.then(async () => {
    const wait = lastNominatimAt + NOMINATIM_MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastNominatimAt = Date.now();
    return task();
  });
  // Keep the chain alive even if one task rejects.
  nominatimChain = run.catch(() => undefined);
  return run;
}

type MapboxFeature = {
  id: string;
  properties: {
    name?: string;
    name_preferred?: string;
    full_address?: string;
    place_formatted?: string;
    coordinates?: { latitude: number; longitude: number };
  };
};

async function searchMapbox(query: string, limit: number): Promise<GeoPlace[] | null> {
  const url =
    "https://api.mapbox.com/search/geocode/v6/forward" +
    `?q=${encodeURIComponent(query)}` +
    `&limit=${limit}` +
    "&country=be,fr,nl,lu,de" +
    "&language=fr" +
    "&types=address,street,place,poi,postcode,locality,neighborhood" +
    `&access_token=${env.mapbox.token}`;

  const data = await fetchJson<{ features?: MapboxFeature[] }>(url);
  if (!data?.features) return null;

  return data.features.flatMap((feature) => {
    const coords = feature.properties.coordinates;
    if (!coords) return [];
    const name = feature.properties.name_preferred || feature.properties.name || "";
    return [
      {
        id: feature.id,
        name,
        fullAddress:
          feature.properties.full_address ||
          [name, feature.properties.place_formatted].filter(Boolean).join(", "),
        lat: coords.latitude,
        lng: coords.longitude,
      },
    ];
  });
}

type NominatimResult = {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
};

async function searchNominatim(query: string, limit: number): Promise<GeoPlace[] | null> {
  const url =
    "https://nominatim.openstreetmap.org/search" +
    `?q=${encodeURIComponent(query)}` +
    `&format=jsonv2&limit=${limit}&addressdetails=1` +
    "&countrycodes=be,fr,nl,lu,de" +
    "&accept-language=fr";

  const data = await throttleNominatim(() => fetchJson<NominatimResult[]>(url));
  if (!Array.isArray(data)) return null;

  return data.map((row) => {
    // Nominatim's display_name is exhaustive to the point of noise; the first
    // three components are the part a person recognises.
    const parts = row.display_name.split(", ");
    return {
      id: String(row.place_id),
      name: row.name || parts.slice(0, 2).join(", "),
      fullAddress: row.display_name,
      lat: Number(row.lat),
      lng: Number(row.lon),
    };
  });
}

export async function searchAddresses(query: string, limit = 6): Promise<GeoPlace[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const cacheKey = `${trimmed.toLowerCase()}|${limit}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const results =
    (env.mapbox.enabled ? await searchMapbox(trimmed, limit) : null) ??
    (await searchNominatim(trimmed, limit)) ??
    [];

  if (results.length) writeCache(cacheKey, results);
  return results;
}

/* ------------------------------------------------------------------ */
/* Route distance                                                      */
/* ------------------------------------------------------------------ */

const EARTH_RADIUS_M = 6_371_000;

/**
 * Roads are never straight. Comparing OSRM results against straight-line
 * distance across Belgian journeys puts the ratio at roughly 1.3, which is
 * what this factor reflects. Only used when routing is unavailable.
 */
const ROAD_FACTOR = 1.3;
/** Average door-to-door speed used to estimate a duration, in km/h. */
const AVERAGE_SPEED_KMH = 55;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function estimateRoute(points: LatLng[]): RouteResult {
  let straight = 0;
  for (let i = 1; i < points.length; i += 1) straight += haversineMeters(points[i - 1], points[i]);
  const distanceMeters = Math.round(straight * ROAD_FACTOR);
  return {
    distanceMeters,
    durationSeconds: Math.round((distanceMeters / 1000 / AVERAGE_SPEED_KMH) * 3600),
    provider: "haversine",
    estimated: true,
  };
}

async function routeMapbox(points: LatLng[]): Promise<RouteResult | null> {
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}` +
    `?overview=false&access_token=${env.mapbox.token}`;

  const data = await fetchJson<{ routes?: { distance: number; duration: number }[] }>(url);
  const route = data?.routes?.[0];
  if (!route) return null;

  return {
    distanceMeters: Math.round(route.distance),
    durationSeconds: Math.round(route.duration),
    provider: "mapbox",
    estimated: false,
  };
}

async function routeOsrm(points: LatLng[]): Promise<RouteResult | null> {
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`;

  const data = await fetchJson<{
    code?: string;
    routes?: { distance: number; duration: number }[];
  }>(url);
  const route = data?.code === "Ok" ? data.routes?.[0] : null;
  if (!route) return null;

  return {
    distanceMeters: Math.round(route.distance),
    durationSeconds: Math.round(route.duration),
    provider: "osrm",
    estimated: false,
  };
}

/**
 * Driven distance through every point in order: pickup, each intermediate
 * stop, then the destination.
 */
export async function calculateRoute(points: LatLng[]): Promise<RouteResult> {
  const valid = points.filter(
    (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && (p.lat !== 0 || p.lng !== 0),
  );
  if (valid.length < 2) {
    return { distanceMeters: 0, durationSeconds: 0, provider: "haversine", estimated: true };
  }

  if (env.mapbox.enabled) {
    const mapbox = await routeMapbox(valid);
    if (mapbox) return mapbox;
  }

  const osrm = await routeOsrm(valid);
  if (osrm) return osrm;

  return estimateRoute(valid);
}
