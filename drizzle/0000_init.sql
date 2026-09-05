CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."contact_status" AS ENUM('new', 'read', 'answered', 'archived');--> statement-breakpoint
CREATE TYPE "public"."driver_status" AS ENUM('pending', 'approved', 'suspended', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'processing', 'paid', 'refunded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('transfer', 'disposal');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('client', 'driver', 'admin');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "booking_events" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"actor_id" text,
	"type" text NOT NULL,
	"message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"client_id" text NOT NULL,
	"driver_id" text,
	"claimed_at" timestamp with time zone,
	"vehicle_category_id" text NOT NULL,
	"service_type" "service_type" NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"pickup_address" text NOT NULL,
	"pickup_lat" real NOT NULL,
	"pickup_lng" real NOT NULL,
	"dropoff_address" text NOT NULL,
	"dropoff_lat" real NOT NULL,
	"dropoff_lng" real NOT NULL,
	"stops" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration_hours" integer,
	"distance_meters" integer DEFAULT 0 NOT NULL,
	"route_duration_seconds" integer DEFAULT 0 NOT NULL,
	"passengers" integer DEFAULT 1 NOT NULL,
	"luggage" integer DEFAULT 0 NOT NULL,
	"flight_number" text,
	"notes" text,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text NOT NULL,
	"price_htva_cents" integer NOT NULL,
	"vat_bps" integer DEFAULT 600 NOT NULL,
	"vat_cents" integer NOT NULL,
	"price_ttc_cents" integer NOT NULL,
	"price_breakdown" jsonb,
	"commission_bps" integer,
	"commission_cents" integer,
	"driver_earnings_cents" integer,
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"paid_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" "contact_status" DEFAULT 'new' NOT NULL,
	"user_id" text,
	"booking_id" text,
	"admin_reply" text,
	"replied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" "driver_status" DEFAULT 'pending' NOT NULL,
	"company_name" text NOT NULL,
	"display_name" text,
	"bio" text,
	"photo_url" text,
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"years_experience" integer,
	"car_make" text,
	"car_model" text,
	"car_year" integer,
	"car_color" text,
	"license_plate" text,
	"car_photo_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"vehicle_category_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"vat_number" text,
	"license_number" text,
	"iban" text,
	"commission_bps" integer DEFAULT 2000 NOT NULL,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "driver_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"url" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp with time zone,
	"image" text,
	"password_hash" text,
	"role" "user_role" DEFAULT 'client' NOT NULL,
	"phone" text,
	"locale" text DEFAULT 'fr' NOT NULL,
	"blocked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicle_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"year" integer DEFAULT 2026 NOT NULL,
	"description_fr" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"price_per_km_cents" integer NOT NULL,
	"price_per_hour_cents" integer NOT NULL,
	"minimum_price_cents" integer NOT NULL,
	"passenger_capacity" integer DEFAULT 3 NOT NULL,
	"luggage_capacity" integer DEFAULT 3 NOT NULL,
	"image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"features_fr" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"features_en" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicle_category_id_vehicle_categories_id_fk" FOREIGN KEY ("vehicle_category_id") REFERENCES "public"."vehicle_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_events_booking_idx" ON "booking_events" USING btree ("booking_id","created_at");--> statement-breakpoint
CREATE INDEX "bookings_client_idx" ON "bookings" USING btree ("client_id","created_at");--> statement-breakpoint
CREATE INDEX "bookings_driver_idx" ON "bookings" USING btree ("driver_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "bookings_board_idx" ON "bookings" USING btree ("status","driver_id","scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_stripe_session_idx" ON "bookings" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE INDEX "contact_messages_status_idx" ON "contact_messages" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "driver_profiles_status_idx" ON "driver_profiles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "vehicle_categories_active_idx" ON "vehicle_categories" USING btree ("is_active","sort_order");