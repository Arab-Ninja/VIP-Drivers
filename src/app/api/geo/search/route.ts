import { NextResponse } from "next/server";
import { searchAddresses } from "@/server/routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Upstream geocoding, routing and Stripe calls can be slow; the platform
// default of 10s is not always enough.
export const maxDuration = 30;

/**
 * Address autocomplete proxy. Exists so the Mapbox token stays on the server
 * and so the provider can be swapped without touching the client.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";

  if (query.trim().length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchAddresses(query, 6);
    return NextResponse.json(
      { results },
      // Identical prefixes are re-requested constantly while typing.
      { headers: { "Cache-Control": "private, max-age=120" } },
    );
  } catch (error) {
    console.error("[geo/search]", error);
    return NextResponse.json({ results: [] }, { status: 200 });
  }
}
