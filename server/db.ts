import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, Quote, InsertQuote, quotes, DisposalRequest, InsertDisposalRequest, disposalRequests } from "../drizzle/schema";
import { ENV } from './_core/env';

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
    } else if (user.openId === ENV.ownerOpenId) {
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
