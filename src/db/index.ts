import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { sanitiseConnectionString } from "./connection-string";
import { env } from "@/lib/env";

export type Database = PostgresJsDatabase<typeof schema>;

/**
 * Database client.
 *
 * Nothing here connects, or even reads DATABASE_URL, until the first query.
 * That matters at build time: `next build` imports every route module to
 * collect page data, so a client constructed at module scope would make a
 * missing DATABASE_URL fail the entire build rather than an individual
 * request. Deployments set their environment variables independently of when
 * the code is compiled, and the build must not depend on them.
 *
 * Serverless functions are recycled constantly and Next's dev server reloads
 * modules on every edit, so the connection is cached on globalThis to avoid
 * opening a fresh pool each time and exhausting the database's connection
 * limit.
 */
const globalForDb = globalThis as unknown as {
  vipDriversSql?: ReturnType<typeof postgres>;
  vipDriversDb?: Database;
};

function createClient() {
  // Providers append client-only parameters (Neon's channel_binding,
  // Supabase's pgbouncer) that the server would reject; see
  // ./connection-string.
  return postgres(sanitiseConnectionString(env.databaseUrl), {
    // Neon and Supabase front Postgres with PgBouncer in transaction mode,
    // which cannot support prepared statements.
    prepare: false,
    max: env.isProduction ? 1 : 5,
    idle_timeout: 20,
    connect_timeout: 15,
  });
}

/** The underlying postgres.js client, opened on first use. */
export function getSql(): ReturnType<typeof postgres> {
  if (!globalForDb.vipDriversSql) globalForDb.vipDriversSql = createClient();
  return globalForDb.vipDriversSql;
}

/**
 * The real Drizzle instance, not the proxy below.
 *
 * Needed by anything that inspects the object itself rather than just calling
 * methods on it — the Auth.js Drizzle adapter, for one, detects the SQL
 * dialect with `instanceof`, which a proxy cannot satisfy.
 */
export function getDb(): Database {
  if (!globalForDb.vipDriversDb) {
    globalForDb.vipDriversDb = drizzle(getSql(), { schema });
  }
  return globalForDb.vipDriversDb;
}

/**
 * Closes the pool. Only needed by standalone scripts (seed, tests) that must
 * let the Node process exit; long-running servers keep the pool open.
 */
export async function closeDb(): Promise<void> {
  const client = globalForDb.vipDriversSql;
  globalForDb.vipDriversSql = undefined;
  globalForDb.vipDriversDb = undefined;
  if (client) await client.end();
}

/**
 * Drizzle instance. A proxy so that importing this module has no side effects
 * whatsoever — the real client is built on the first property access.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, property) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[property];
    // Methods must keep their `this`, which would otherwise be the proxy.
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(real)
      : value;
  },
  has(_target, property) {
    return property in (getDb() as unknown as object);
  },
});

export { schema };
