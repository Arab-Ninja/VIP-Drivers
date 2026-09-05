import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/lib/env";

/**
 * Serverless functions are recycled constantly, and Next's dev server reloads
 * modules on every edit. Both would open a fresh pool each time and exhaust
 * the database's connection limit, so the client is cached on globalThis.
 */
const globalForDb = globalThis as unknown as {
  vipDriversSql?: ReturnType<typeof postgres>;
};

function createClient() {
  return postgres(env.databaseUrl, {
    // Neon and Supabase front Postgres with PgBouncer in transaction mode,
    // which cannot support prepared statements.
    prepare: false,
    max: env.isProduction ? 1 : 5,
    idle_timeout: 20,
    connect_timeout: 15,
  });
}

const sql = globalForDb.vipDriversSql ?? createClient();
if (!env.isProduction) globalForDb.vipDriversSql = sql;

export const db = drizzle(sql, { schema });
export { sql, schema };
export type Database = typeof db;
