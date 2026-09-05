import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/lib/env";

/**
 * Serverless functions are recycled constantly, and Next's dev server reloads
 * modules on every edit. Both would open a fresh pool each time and exhaust
 * the database's connection limit, so the client (and the drizzle instance
 * built on top of it) is cached on globalThis.
 */
const globalForDb = globalThis as unknown as {
  vipDriversSql?: ReturnType<typeof postgres>;
  vipDriversDb?: ReturnType<typeof drizzle<typeof schema>>;
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

/**
 * Both the client and drizzle instance are created lazily, on first use, and
 * then cached on globalThis. Next.js evaluates every module reachable from
 * the root layout while collecting page data at build time (e.g. for
 * /_not-found), even for routes that never touch the database, so connecting
 * eagerly here would make `DATABASE_URL` a hard requirement just to run
 * `next build`.
 *
 * Caching on globalThis (rather than only in a module-scope variable) is
 * done unconditionally, including in production: Vercel/Node serverless
 * runtimes reuse warm containers across invocations within the same
 * process, so this still avoids opening a fresh pool per request, exactly
 * like the previous eager-init version did.
 */
function getClient(): ReturnType<typeof postgres> {
  if (!globalForDb.vipDriversSql) globalForDb.vipDriversSql = createClient();
  return globalForDb.vipDriversSql;
}

function getDb() {
  if (!globalForDb.vipDriversDb) globalForDb.vipDriversDb = drizzle(getClient(), { schema });
  return globalForDb.vipDriversDb;
}

function baseLazyHandler<T extends object>(get: () => T): ProxyHandler<T> {
  return {
    get(_target, prop, receiver) {
      return Reflect.get(get() as object, prop, receiver);
    },
    has(_target, prop) {
      return Reflect.has(get() as object, prop);
    },
    ownKeys(_target) {
      return Reflect.ownKeys(get() as object);
    },
    getOwnPropertyDescriptor(_target, prop) {
      return Reflect.getOwnPropertyDescriptor(get() as object, prop);
    },
    getPrototypeOf(_target) {
      return Reflect.getPrototypeOf(get() as object);
    },
  };
}

function makeLazyProxy<T extends object>(get: () => T): T {
  return new Proxy({} as T, baseLazyHandler(get));
}

/** Like {@link makeLazyProxy}, but the result is also callable, for `sql` itself being a tagged-template function. */
function makeLazyCallableProxy<T extends (...args: never[]) => unknown>(get: () => T): T {
  return new Proxy(function () {} as unknown as T, {
    ...baseLazyHandler(get),
    apply(_target, thisArg, args) {
      return Reflect.apply(get(), thisArg, args);
    },
    construct(_target, args) {
      return Reflect.construct(get() as unknown as new (...a: unknown[]) => object, args);
    },
  });
}

export const db = makeLazyProxy(getDb);
export const sql = makeLazyCallableProxy(getClient);
export { schema };
export type Database = typeof db;
