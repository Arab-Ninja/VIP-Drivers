import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
  pgEnum,
  real,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const userRoleEnum = pgEnum("user_role", ["client", "driver", "admin"]);

export const driverStatusEnum = pgEnum("driver_status", [
  "pending", // signed up, awaiting admin approval
  "approved", // may claim rides
  "suspended", // temporarily blocked by admin
  "rejected",
]);

export const serviceTypeEnum = pgEnum("service_type", ["transfer", "disposal"]);

/**
 * Booking lifecycle, exactly as specified:
 *   pending   -> client confirmed their selection, payment outstanding
 *   confirmed -> payment captured, ride is live and claimable by a driver
 *   completed -> ride has been carried out
 *   cancelled -> called off by the client or an admin
 */
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "processing",
  "paid",
  "refunded",
  "failed",
]);

export const contactStatusEnum = pgEnum("contact_status", ["new", "read", "answered", "archived"]);

/* ------------------------------------------------------------------ */
/* Auth.js core tables                                                 */
/* ------------------------------------------------------------------ */

export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    email: text("email").unique(),
    emailVerified: timestamp("email_verified", { mode: "date", withTimezone: true }),
    image: text("image"),

    // Local credentials login. Null for accounts created purely through Google.
    passwordHash: text("password_hash"),

    role: userRoleEnum("role").notNull().default("client"),
    phone: text("phone"),
    locale: text("locale").notNull().default("fr"),

    // Set by an admin to lock an account out without deleting its history.
    blockedAt: timestamp("blocked_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("users_role_idx").on(t.role)],
);

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/* ------------------------------------------------------------------ */
/* Driver partners                                                     */
/* ------------------------------------------------------------------ */

export const driverProfiles = pgTable(
  "driver_profiles",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),

    status: driverStatusEnum("status").notNull().default("pending"),

    // Public-facing partner identity
    companyName: text("company_name").notNull(),
    displayName: text("display_name"),
    bio: text("bio"),
    photoUrl: text("photo_url"),
    languages: jsonb("languages").$type<string[]>().notNull().default([]),
    yearsExperience: integer("years_experience"),

    // The car this partner drives, broadcast on their profile
    carMake: text("car_make"),
    carModel: text("car_model"),
    carYear: integer("car_year"),
    carColor: text("car_color"),
    licensePlate: text("license_plate"),
    carPhotoUrls: jsonb("car_photo_urls").$type<string[]>().notNull().default([]),

    // Which of the company's categories this driver is cleared to serve.
    // Empty array means "any category".
    vehicleCategoryIds: jsonb("vehicle_category_ids").$type<string[]>().notNull().default([]),

    // Administrative / billing
    vatNumber: text("vat_number"),
    licenseNumber: text("license_number"),
    iban: text("iban"),

    /**
     * Share of the fare kept by VIP Drivers, in basis points (2000 = 20%).
     * Overridable per driver so the best partners can be given better terms.
     */
    commissionBps: integer("commission_bps").notNull().default(2000),

    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("driver_profiles_status_idx").on(t.status)],
);

/* ------------------------------------------------------------------ */
/* Fleet                                                               */
/* ------------------------------------------------------------------ */

export const vehicleCategories = pgTable(
  "vehicle_categories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    year: integer("year").notNull().default(2026),

    descriptionFr: text("description_fr").notNull().default(""),
    descriptionEn: text("description_en").notNull().default(""),

    /* Pricing, all HTVA (VAT-exclusive) and stored in euro cents so no
       floating-point drift ever reaches an invoice. */
    pricePerKmCents: integer("price_per_km_cents").notNull(),
    pricePerHourCents: integer("price_per_hour_cents").notNull(),
    minimumPriceCents: integer("minimum_price_cents").notNull(),

    passengerCapacity: integer("passenger_capacity").notNull().default(3),
    luggageCapacity: integer("luggage_capacity").notNull().default(3),

    imageUrls: jsonb("image_urls").$type<string[]>().notNull().default([]),
    featuresFr: jsonb("features_fr").$type<string[]>().notNull().default([]),
    featuresEn: jsonb("features_en").$type<string[]>().notNull().default([]),

    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("vehicle_categories_active_idx").on(t.isActive, t.sortOrder)],
);

/* ------------------------------------------------------------------ */
/* Bookings                                                            */
/* ------------------------------------------------------------------ */

export type BookingStop = {
  address: string;
  lat: number;
  lng: number;
};

export const bookings = pgTable(
  "bookings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    /** Human-readable reference shown to clients and drivers, e.g. VIP-7QK4M2. */
    reference: text("reference").notNull().unique(),

    clientId: text("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    /**
     * The single driver carrying out this ride. Null until claimed.
     * A partial unique index is not needed: this column IS the assignment,
     * and claims are performed with a conditional UPDATE ... WHERE driver_id
     * IS NULL, so two drivers can never hold the same ride.
     */
    driverId: text("driver_id").references(() => users.id, { onDelete: "set null" }),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),

    vehicleCategoryId: text("vehicle_category_id")
      .notNull()
      .references(() => vehicleCategories.id, { onDelete: "restrict" }),

    serviceType: serviceTypeEnum("service_type").notNull(),
    status: bookingStatusEnum("status").notNull().default("pending"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("unpaid"),

    /* Itinerary */
    pickupAddress: text("pickup_address").notNull(),
    pickupLat: real("pickup_lat").notNull(),
    pickupLng: real("pickup_lng").notNull(),
    dropoffAddress: text("dropoff_address").notNull(),
    dropoffLat: real("dropoff_lat").notNull(),
    dropoffLng: real("dropoff_lng").notNull(),
    /** Intermediate stops, in order, for multi-leg transfers. */
    stops: jsonb("stops").$type<BookingStop[]>().notNull().default([]),

    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    /** Disposal only: how many hours the car and driver are retained. */
    durationHours: integer("duration_hours"),

    /* Route measured at booking time; frozen so the price can always be re-explained. */
    distanceMeters: integer("distance_meters").notNull().default(0),
    routeDurationSeconds: integer("route_duration_seconds").notNull().default(0),

    passengers: integer("passengers").notNull().default(1),
    luggage: integer("luggage").notNull().default(0),
    flightNumber: text("flight_number"),
    notes: text("notes"),

    /* Contact details captured on the booking itself: the passenger is not
       always the account holder. */
    contactName: text("contact_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone").notNull(),

    /* Price breakdown, euro cents, frozen at confirmation time */
    priceHtvaCents: integer("price_htva_cents").notNull(),
    vatBps: integer("vat_bps").notNull().default(600), // 6% Belgian passenger transport
    vatCents: integer("vat_cents").notNull(),
    priceTtcCents: integer("price_ttc_cents").notNull(),
    /** Snapshot of the pricing inputs used, for a fully auditable quote. */
    priceBreakdown: jsonb("price_breakdown").$type<Record<string, unknown>>(),

    /* Driver remuneration, resolved when the ride is claimed */
    commissionBps: integer("commission_bps"),
    commissionCents: integer("commission_cents"),
    driverEarningsCents: integer("driver_earnings_cents"),

    /* Stripe */
    stripeSessionId: text("stripe_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    paidAt: timestamp("paid_at", { withTimezone: true }),

    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("bookings_client_idx").on(t.clientId, t.createdAt),
    index("bookings_driver_idx").on(t.driverId, t.scheduledAt),
    // Drives the drivers' "Available rides" board.
    index("bookings_board_idx").on(t.status, t.driverId, t.scheduledAt),
    uniqueIndex("bookings_stripe_session_idx").on(t.stripeSessionId),
  ],
);

/** Append-only audit trail so admins can see exactly what happened to a ride. */
export const bookingEvents = pgTable(
  "booking_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    message: text("message"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("booking_events_booking_idx").on(t.bookingId, t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Site content, contact, notifications                                */
/* ------------------------------------------------------------------ */

/** Single-row-per-key store for admin-editable site content and settings. */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
});

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    status: contactStatusEnum("status").notNull().default("new"),
    /** Set when the message was sent from a signed-in session. */
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    /** Set when an admin messages a client about a specific booking. */
    bookingId: text("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    adminReply: text("admin_reply"),
    repliedAt: timestamp("replied_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("contact_messages_status_idx").on(t.status, t.createdAt)],
);

/** Web Push endpoints, one row per browser/device a user has enabled. */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("push_subscriptions_user_idx").on(t.userId)],
);

/** In-app notification feed, mirrored by push where the user has opted in. */
export const notifications = pgTable(
  "notifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    url: text("url"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Inferred types                                                      */
/* ------------------------------------------------------------------ */

export type User = typeof users.$inferSelect;
export type DriverProfile = typeof driverProfiles.$inferSelect;
export type VehicleCategory = typeof vehicleCategories.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type BookingEvent = typeof bookingEvents.$inferSelect;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
export type ServiceType = (typeof serviceTypeEnum.enumValues)[number];
export type DriverStatus = (typeof driverStatusEnum.enumValues)[number];
