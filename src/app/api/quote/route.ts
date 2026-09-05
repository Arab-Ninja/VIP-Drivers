import { NextResponse } from "next/server";
import { buildQuote, quoteRequestSchema } from "@/server/quote";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live price preview. The response carries no more than the client needs to
 * render the breakdown; the authoritative price is recomputed when the
 * booking is created, so a tampered response buys nothing.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.issues.map((i) => i.message) },
      { status: 422 },
    );
  }

  const result = await buildQuote(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  const { quote, route, vehicle } = result.data;
  return NextResponse.json({
    quote,
    route,
    vehicle: {
      id: vehicle.id,
      slug: vehicle.slug,
      name: vehicle.name,
      pricePerKmCents: vehicle.pricePerKmCents,
      pricePerHourCents: vehicle.pricePerHourCents,
      minimumPriceCents: vehicle.minimumPriceCents,
    },
  });
}
