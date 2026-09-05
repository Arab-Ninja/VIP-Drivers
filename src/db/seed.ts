/**
 * Database seed.
 *
 *   npm run db:seed            fleet + site settings only (safe, idempotent)
 *   npm run db:seed -- --demo  also creates demo accounts and sample bookings
 *
 * The fleet and settings seed is safe to run against production: it inserts
 * what is missing and leaves anything already there untouched. Demo accounts
 * are opt-in because they create sign-in credentials.
 */
import "./load-env";
import { eq } from "drizzle-orm";
import { db, sql } from "./index";
import {
  users,
  vehicleCategories,
  driverProfiles,
  bookings,
  settings,
  bookingEvents,
} from "./schema";
import { hashPassword } from "@/lib/auth";
import {
  SETTING_KEYS,
  DEFAULT_COMPANY_INFO,
  DEFAULT_OPERATIONAL_SETTINGS,
} from "@/lib/settings";
import { DEFAULT_PRICING_RULES, calculatePrice, splitDriverEarnings } from "@/lib/pricing";
import { generateReference } from "@/lib/utils";

const FLEET = [
  {
    slug: "mercedes-classe-e",
    name: "Mercedes-Benz Classe E",
    year: 2026,
    descriptionFr:
      "La berline de référence pour le voyage d'affaires. Habitacle silencieux, suspension filtrante et finitions soignées : la Classe E est le choix naturel pour un transfert efficace et discret.",
    descriptionEn:
      "The benchmark saloon for business travel. A hushed cabin, absorbent suspension and careful finishing make the E-Class the natural choice for an efficient, discreet transfer.",
    pricePerKmCents: 300,
    pricePerHourCents: 8000,
    minimumPriceCents: 8000,
    passengerCapacity: 3,
    luggageCapacity: 3,
    imageUrls: ["/fleet/classe-e.svg"],
    featuresFr: [
      "Sièges cuir chauffants",
      "Climatisation bi-zone",
      "Wi-Fi à bord",
      "Eau minérale offerte",
      "Prises USB-C",
      "Vitres arrière teintées",
    ],
    featuresEn: [
      "Heated leather seats",
      "Dual-zone climate control",
      "On-board Wi-Fi",
      "Complimentary mineral water",
      "USB-C outlets",
      "Tinted rear windows",
    ],
    sortOrder: 1,
  },
  {
    slug: "mercedes-classe-v",
    name: "Mercedes-Benz Classe V",
    year: 2026,
    descriptionFr:
      "Le van d'exception pour les groupes et les familles. Sept places en configuration salon, un volume de bagages généreux et un accès facilité par portes coulissantes.",
    descriptionEn:
      "The exceptional van for groups and families. Seven seats in lounge configuration, generous luggage volume and easy access through sliding doors.",
    pricePerKmCents: 350,
    pricePerHourCents: 9000,
    minimumPriceCents: 9000,
    passengerCapacity: 7,
    luggageCapacity: 7,
    imageUrls: ["/fleet/classe-v.svg"],
    featuresFr: [
      "7 places assises",
      "Configuration salon face à face",
      "Portes coulissantes électriques",
      "Grand volume de bagages",
      "Climatisation 3 zones",
      "Wi-Fi à bord",
    ],
    featuresEn: [
      "7 seats",
      "Face-to-face lounge layout",
      "Powered sliding doors",
      "Large luggage capacity",
      "Three-zone climate control",
      "On-board Wi-Fi",
    ],
    sortOrder: 2,
  },
  {
    slug: "mercedes-classe-s",
    name: "Mercedes-Benz Classe S",
    year: 2026,
    descriptionFr:
      "Le vaisseau amiral. Places arrière inclinables, isolation acoustique intégrale et sonorisation Burmester : la Classe S transforme un trajet en parenthèse.",
    descriptionEn:
      "The flagship. Reclining rear seats, complete acoustic isolation and a Burmester sound system: the S-Class turns a journey into an interlude.",
    pricePerKmCents: 400,
    pricePerHourCents: 11000,
    minimumPriceCents: 11000,
    passengerCapacity: 3,
    luggageCapacity: 3,
    imageUrls: ["/fleet/classe-s.svg"],
    featuresFr: [
      "Sièges arrière inclinables",
      "Sonorisation Burmester",
      "Isolation acoustique renforcée",
      "Tablettes de travail",
      "Rideaux pare-soleil électriques",
      "Champagne sur demande",
    ],
    featuresEn: [
      "Reclining rear seats",
      "Burmester sound system",
      "Enhanced acoustic insulation",
      "Folding work tables",
      "Powered sun blinds",
      "Champagne on request",
    ],
    sortOrder: 3,
  },
];

async function seedFleet() {
  for (const vehicle of FLEET) {
    const [existing] = await db
      .select({ id: vehicleCategories.id })
      .from(vehicleCategories)
      .where(eq(vehicleCategories.slug, vehicle.slug))
      .limit(1);

    if (existing) {
      console.log(`  = ${vehicle.name} already present, left untouched`);
      continue;
    }
    await db.insert(vehicleCategories).values(vehicle);
    console.log(`  + ${vehicle.name}`);
  }
}

async function seedSettings() {
  const rows = [
    { key: SETTING_KEYS.company, value: DEFAULT_COMPANY_INFO },
    { key: SETTING_KEYS.pricing, value: DEFAULT_PRICING_RULES },
    { key: SETTING_KEYS.operations, value: DEFAULT_OPERATIONAL_SETTINGS },
  ];
  for (const row of rows) {
    const [existing] = await db.select().from(settings).where(eq(settings.key, row.key)).limit(1);
    if (existing) {
      console.log(`  = setting "${row.key}" already present`);
      continue;
    }
    await db.insert(settings).values(row);
    console.log(`  + setting "${row.key}"`);
  }
}

async function upsertUser(input: {
  email: string;
  name: string;
  role: "client" | "driver" | "admin";
  phone: string;
  password: string;
}) {
  const [existing] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(users)
    .values({
      email: input.email,
      name: input.name,
      role: input.role,
      phone: input.phone,
      emailVerified: new Date(),
      passwordHash: await hashPassword(input.password),
    })
    .returning();
  return created;
}

async function seedDemo() {
  const password = process.env.SEED_PASSWORD || "VipDrivers2026!";

  const admin = await upsertUser({
    email: "admin@vipdrivers.be",
    name: "Administration VIP",
    role: "admin",
    phone: "+32 470 00 00 01",
    password,
  });
  const driver = await upsertUser({
    email: "driver@vipdrivers.be",
    name: "Marc Lefebvre",
    role: "driver",
    phone: "+32 470 00 00 02",
    password,
  });
  const driver2 = await upsertUser({
    email: "driver2@vipdrivers.be",
    name: "Sofia Renard",
    role: "driver",
    phone: "+32 470 00 00 04",
    password,
  });
  const client = await upsertUser({
    email: "client@vipdrivers.be",
    name: "Claire Dubois",
    role: "client",
    phone: "+32 470 00 00 03",
    password,
  });

  const profiles = [
    {
      userId: driver.id,
      companyName: "Lefebvre Chauffeur Services SRL",
      displayName: "Marc L.",
      bio: "Quinze ans au service d'une clientèle d'affaires entre Bruxelles, Paris et Amsterdam. Discrétion absolue, ponctualité sans compromis.",
      languages: ["Français", "Anglais", "Néerlandais"],
      yearsExperience: 15,
      carMake: "Mercedes-Benz",
      carModel: "Classe S",
      carYear: 2026,
      carColor: "Noir obsidienne",
      licensePlate: "1-VIP-001",
      vatNumber: "BE 0700.111.222",
      status: "approved" as const,
      approvedAt: new Date(),
    },
    {
      userId: driver2.id,
      companyName: "Renard Prestige Cars",
      displayName: "Sofia R.",
      bio: "Chauffeure professionnelle spécialisée dans l'accueil de délégations internationales et les transferts aéroport.",
      languages: ["Français", "Anglais", "Espagnol"],
      yearsExperience: 8,
      carMake: "Mercedes-Benz",
      carModel: "Classe V",
      carYear: 2026,
      carColor: "Gris sélénite",
      licensePlate: "1-VIP-002",
      vatNumber: "BE 0700.333.444",
      status: "pending" as const,
      approvedAt: null,
    },
  ];

  for (const profile of profiles) {
    const [existing] = await db
      .select()
      .from(driverProfiles)
      .where(eq(driverProfiles.userId, profile.userId))
      .limit(1);
    if (existing) continue;
    await db.insert(driverProfiles).values(profile);
  }

  console.log(`  + demo accounts (password: ${password})`);
  return { admin, driver, client };
}

async function seedBookings(client: { id: string; name: string | null; email: string | null }, driverId: string) {
  const existing = await db.select({ id: bookings.id }).from(bookings).limit(1);
  if (existing.length) {
    console.log("  = bookings already present, skipping samples");
    return;
  }

  const fleet = await db.select().from(vehicleCategories);
  const bySlug = Object.fromEntries(fleet.map((v) => [v.slug, v]));
  const day = 24 * 60 * 60 * 1000;

  const samples = [
    {
      vehicle: bySlug["mercedes-classe-s"],
      serviceType: "transfer" as const,
      status: "confirmed" as const,
      paymentStatus: "paid" as const,
      driverId: null as string | null,
      pickupAddress: "Brussels Airport (BRU), Zaventem",
      pickupLat: 50.9014,
      pickupLng: 4.4844,
      dropoffAddress: "Hotel Amigo, Rue de l'Amigo 1, 1000 Bruxelles",
      dropoffLat: 50.8459,
      dropoffLng: 4.3512,
      distanceMeters: 15_400,
      routeDurationSeconds: 1_680,
      scheduledAt: new Date(Date.now() + 2 * day),
      flightNumber: "SN2104",
      passengers: 2,
      luggage: 3,
    },
    {
      vehicle: bySlug["mercedes-classe-v"],
      serviceType: "disposal" as const,
      status: "confirmed" as const,
      paymentStatus: "paid" as const,
      driverId: null,
      pickupAddress: "Square de Meeûs 35, 1000 Bruxelles",
      pickupLat: 50.8385,
      pickupLng: 4.3697,
      dropoffAddress: "Square de Meeûs 35, 1000 Bruxelles",
      dropoffLat: 50.8385,
      dropoffLng: 4.3697,
      durationHours: 6,
      distanceMeters: 0,
      routeDurationSeconds: 0,
      scheduledAt: new Date(Date.now() + 4 * day),
      passengers: 5,
      luggage: 2,
    },
    {
      vehicle: bySlug["mercedes-classe-e"],
      serviceType: "transfer" as const,
      status: "completed" as const,
      paymentStatus: "paid" as const,
      driverId,
      pickupAddress: "Gare de Bruxelles-Midi, 1060 Bruxelles",
      pickupLat: 50.8358,
      pickupLng: 4.3357,
      dropoffAddress: "Avenue Louise 480, 1050 Bruxelles",
      dropoffLat: 50.8225,
      dropoffLng: 4.3746,
      distanceMeters: 6_200,
      routeDurationSeconds: 900,
      scheduledAt: new Date(Date.now() - 6 * day),
      passengers: 1,
      luggage: 1,
    },
    {
      vehicle: bySlug["mercedes-classe-s"],
      serviceType: "transfer" as const,
      status: "completed" as const,
      paymentStatus: "paid" as const,
      driverId,
      pickupAddress: "Avenue Louise 143, 1050 Bruxelles",
      pickupLat: 50.8286,
      pickupLng: 4.3641,
      dropoffAddress: "Aéroport de Paris-Charles de Gaulle, France",
      dropoffLat: 49.0097,
      dropoffLng: 2.5479,
      distanceMeters: 316_000,
      routeDurationSeconds: 12_600,
      scheduledAt: new Date(Date.now() - 14 * day),
      passengers: 2,
      luggage: 4,
    },
    {
      vehicle: bySlug["mercedes-classe-e"],
      serviceType: "transfer" as const,
      status: "pending" as const,
      paymentStatus: "unpaid" as const,
      driverId: null,
      pickupAddress: "Grand-Place, 1000 Bruxelles",
      pickupLat: 50.8467,
      pickupLng: 4.3525,
      dropoffAddress: "Gare de Liège-Guillemins, 4000 Liège",
      dropoffLat: 50.6244,
      dropoffLng: 5.5668,
      distanceMeters: 101_000,
      routeDurationSeconds: 4_200,
      scheduledAt: new Date(Date.now() + 9 * day),
      passengers: 3,
      luggage: 2,
    },
  ];

  for (const s of samples) {
    if (!s.vehicle) continue;
    const quote = calculatePrice({
      serviceType: s.serviceType,
      rates: s.vehicle,
      distanceMeters: s.distanceMeters,
      durationHours: s.durationHours,
      scheduledAt: s.scheduledAt,
      rules: DEFAULT_PRICING_RULES,
    });
    const earnings = s.driverId ? splitDriverEarnings(quote.htvaCents, 2000) : null;

    const [row] = await db
      .insert(bookings)
      .values({
        reference: generateReference(),
        clientId: client.id,
        driverId: s.driverId,
        claimedAt: s.driverId ? new Date(s.scheduledAt.getTime() - day) : null,
        vehicleCategoryId: s.vehicle.id,
        serviceType: s.serviceType,
        status: s.status,
        paymentStatus: s.paymentStatus,
        pickupAddress: s.pickupAddress,
        pickupLat: s.pickupLat,
        pickupLng: s.pickupLng,
        dropoffAddress: s.dropoffAddress,
        dropoffLat: s.dropoffLat,
        dropoffLng: s.dropoffLng,
        scheduledAt: s.scheduledAt,
        durationHours: s.durationHours ?? null,
        distanceMeters: s.distanceMeters,
        routeDurationSeconds: s.routeDurationSeconds,
        passengers: s.passengers,
        luggage: s.luggage,
        flightNumber: s.flightNumber ?? null,
        contactName: client.name ?? "Client",
        contactEmail: client.email ?? "client@vipdrivers.be",
        contactPhone: "+32 470 00 00 03",
        priceHtvaCents: quote.htvaCents,
        vatBps: quote.vatBps,
        vatCents: quote.vatCents,
        priceTtcCents: quote.ttcCents,
        priceBreakdown: quote as unknown as Record<string, unknown>,
        commissionBps: s.driverId ? 2000 : null,
        commissionCents: earnings?.commissionCents ?? null,
        driverEarningsCents: earnings?.driverEarningsCents ?? null,
        paidAt: s.paymentStatus === "paid" ? new Date(s.scheduledAt.getTime() - 2 * day) : null,
        completedAt: s.status === "completed" ? s.scheduledAt : null,
      })
      .returning();

    await db.insert(bookingEvents).values({
      bookingId: row.id,
      type: "seeded",
      message: "Sample booking created by the seed script",
    });
  }
  console.log(`  + ${samples.length} sample bookings`);
}

async function main() {
  const demo = process.argv.includes("--demo");
  console.log("Seeding VIP Drivers database…\n");

  console.log("Fleet:");
  await seedFleet();

  console.log("\nSettings:");
  await seedSettings();

  if (demo) {
    console.log("\nDemo data:");
    const { driver, client } = await seedDemo();
    await seedBookings(client, driver.id);
  } else {
    console.log("\nSkipping demo accounts. Pass --demo to create them.");
  }

  console.log("\nDone.");
  await sql.end();
}

main().catch(async (error) => {
  console.error("Seed failed:", error);
  await sql.end().catch(() => {});
  process.exit(1);
});
