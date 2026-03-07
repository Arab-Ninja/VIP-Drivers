import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, Quote, InsertQuote, quotes, DisposalRequest, InsertDisposalRequest, disposalRequests, VehicleConfig, InsertVehicleConfig, vehicleConfigs } from "../drizzle/schema";
import { ENV } from './_core/env';
import { ADMIN_EMAIL } from '../shared/const';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId || user.email === ADMIN_EMAIL) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createQuote(quote: InsertQuote): Promise<Quote | null> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const result = await db.insert(quotes).values(quote);
    const id = result[0]?.insertId;
    if (!id) return null;
    
    return db.select().from(quotes).where(eq(quotes.id, id as number)).then(r => r[0] || null);
  } catch (error) {
    console.error("[Database] Failed to create quote:", error);
    return null;
  }
}

export async function getQuoteById(id: number): Promise<Quote | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  return result[0] || null;
}

export async function getAllQuotes(): Promise<Quote[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(quotes).orderBy(quotes.createdAt);
}

export async function createDisposalRequest(request: InsertDisposalRequest): Promise<DisposalRequest | null> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const result = await db.insert(disposalRequests).values(request);
    const id = result[0]?.insertId;
    if (!id) return null;
    
    return db.select().from(disposalRequests).where(eq(disposalRequests.id, id as number)).then(r => r[0] || null);
  } catch (error) {
    console.error("[Database] Failed to create disposal request:", error);
    return null;
  }
}

export async function getDisposalRequestById(id: number): Promise<DisposalRequest | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(disposalRequests).where(eq(disposalRequests.id, id)).limit(1);
  return result[0] || null;
}

export async function getAllDisposalRequests(): Promise<DisposalRequest[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(disposalRequests).orderBy(disposalRequests.createdAt);
}

export async function getAllVehicleConfigs(): Promise<VehicleConfig[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    return db.select().from(vehicleConfigs).where(eq(vehicleConfigs.active, "yes")).orderBy(vehicleConfigs.id);
  } catch (error) {
    console.error("[Database] Failed to get vehicle configs:", error);
    return [];
  }
}

export async function getVehicleConfigById(vehicleId: string): Promise<VehicleConfig | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(vehicleConfigs).where(eq(vehicleConfigs.vehicleId, vehicleId)).limit(1);
  return result[0] || null;
}

export async function upsertVehicleConfig(config: InsertVehicleConfig): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert vehicle config: database not available");
    return;
  }

  try {
    await db.insert(vehicleConfigs).values(config).onDuplicateKeyUpdate({
      set: {
        name: config.name,
        category: config.category,
        description: config.description,
        features: config.features,
        pricePerKm: config.pricePerKm,
        pricePerHour: config.pricePerHour,
        minDistance: config.minDistance,
        images: config.images,
        active: config.active,
      },
    });
  } catch (error) {
    console.error("[Database] Failed to upsert vehicle config:", error);
    throw error;
  }
}

export async function deleteVehicleConfig(vehicleId: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete vehicle config: database not available");
    return;
  }

  try {
    await db.delete(vehicleConfigs).where(eq(vehicleConfigs.vehicleId, vehicleId));
  } catch (error) {
    console.error("[Database] Failed to delete vehicle config:", error);
    throw error;
  }
}

export async function updateQuoteStatus(id: number, status: Quote["status"]): Promise<Quote | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.update(quotes).set({ status }).where(eq(quotes.id, id));
    return getQuoteById(id);
  } catch (error) {
    console.error("[Database] Failed to update quote status:", error);
    return null;
  }
}

export async function deleteQuote(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete quote: database not available");
    return;
  }

  try {
    await db.delete(quotes).where(eq(quotes.id, id));
  } catch (error) {
    console.error("[Database] Failed to delete quote:", error);
    throw error;
  }
}

export async function updateDisposalStatus(id: number, status: DisposalRequest["status"]): Promise<DisposalRequest | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.update(disposalRequests).set({ status }).where(eq(disposalRequests.id, id));
    return getDisposalRequestById(id);
  } catch (error) {
    console.error("[Database] Failed to update disposal status:", error);
    return null;
  }
}

export async function deleteDisposal(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete disposal: database not available");
    return;
  }

  try {
    await db.delete(disposalRequests).where(eq(disposalRequests.id, id));
  } catch (error) {
    console.error("[Database] Failed to delete disposal:", error);
    throw error;
  }
}

export async function getQuotesByEmail(email: string): Promise<Quote[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(quotes).where(eq(quotes.clientEmail, email)).orderBy(quotes.createdAt);
}
