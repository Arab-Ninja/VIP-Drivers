import type { Metadata } from "next";

import { getTranslations } from "@/i18n";
import { getActiveFleet } from "@/server/fleet";
import { getOperationalSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { Container, SectionHeading } from "@/components/site/Section";
import { BookingForm, type BookingVehicle } from "@/components/booking/BookingForm";
import type { ServiceType } from "@/db/schema";

export const metadata: Metadata = {
  title: "Réservation",
  description:
    "Réservez un transfert ou une mise à disposition avec chauffeur. Prix calculé en temps réel selon la distance, la durée et le véhicule.",
};

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; vehicle?: string }>;
}) {
  const params = await searchParams;
  const { t, locale } = await getTranslations();

  const [fleet, operations, user] = await Promise.all([
    getActiveFleet(locale),
    getOperationalSettings(),
    getCurrentUser(),
  ]);

  const vehicles: BookingVehicle[] = fleet.map((v) => ({
    id: v.id,
    slug: v.slug,
    name: v.name,
    imageUrl: v.imageUrls[0] ?? null,
    passengerCapacity: v.passengerCapacity,
    luggageCapacity: v.luggageCapacity,
    pricePerKmCents: v.pricePerKmCents,
    pricePerHourCents: v.pricePerHourCents,
    minimumPriceCents: v.minimumPriceCents,
  }));

  const serviceType: ServiceType = params.service === "disposal" ? "disposal" : "transfer";

  return (
    <Container className="py-14 lg:py-20">
      <SectionHeading
        eyebrow={t.nav.booking}
        title={t.booking.title}
        subtitle={t.booking.subtitle}
        align="left"
        className="mb-12"
      />

      {vehicles.length === 0 ? (
        <p className="text-sm text-ink-400">{t.fleet.empty}</p>
      ) : (
        <BookingForm
          vehicles={vehicles}
          defaults={{ serviceType, vehicleSlug: params.vehicle ?? null }}
          limits={{
            minimumLeadTimeHours: operations.minimumLeadTimeHours,
            minDisposalHours: operations.minDisposalHours,
            maxDisposalHours: operations.maxDisposalHours,
            maxStops: operations.maxStops,
          }}
          user={
            user
              ? { name: user.name ?? null, email: user.email ?? null, phone: user.phone ?? null }
              : null
          }
        />
      )}
    </Container>
  );
}
