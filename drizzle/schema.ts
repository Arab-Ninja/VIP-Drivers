import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const quotes = mysqlTable("quotes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  vehicleId: varchar("vehicleId", { length: 64 }).notNull(),
  departureAddress: text("departureAddress").notNull(),
  destinationAddress: text("destinationAddress").notNull(),
  distanceKm: int("distanceKm").notNull(),
  estimatedPrice: int("estimatedPrice").notNull(), // Stocké en centimes
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientEmail: varchar("clientEmail", { length: 320 }).notNull(),
  clientPhone: varchar("clientPhone", { length: 20 }).notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["pending", "accepted", "rejected", "completed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = typeof quotes.$inferInsert;

export const disposalRequests = mysqlTable("disposalRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  vehicleId: varchar("vehicleId", { length: 64 }).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  durationHours: int("durationHours").notNull(),
  totalPrice: int("totalPrice").notNull(), // Stocké en centimes
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientEmail: varchar("clientEmail", { length: 320 }).notNull(),
  clientPhone: varchar("clientPhone", { length: 20 }).notNull(),
  eventDescription: text("eventDescription"),
  specialRequests: text("specialRequests"),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DisposalRequest = typeof disposalRequests.$inferSelect;
export type InsertDisposalRequest = typeof disposalRequests.$inferInsert;

export const vehicleConfigs = mysqlTable("vehicleConfigs", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: varchar("vehicleId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 255 }).notNull(),
  description: text("description").notNull(),
  features: text("features").notNull(), // JSON array stored as text
  pricePerKm: int("pricePerKm").notNull(), // stored as cents (multiply by 100)
  pricePerHour: int("pricePerHour").notNull(), // stored in euros (whole number)
  minDistance: int("minDistance").notNull(),
  images: text("images").notNull(), // JSON array stored as text
  active: mysqlEnum("active", ["yes", "no"]).default("yes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VehicleConfig = typeof vehicleConfigs.$inferSelect;
export type InsertVehicleConfig = typeof vehicleConfigs.$inferInsert;