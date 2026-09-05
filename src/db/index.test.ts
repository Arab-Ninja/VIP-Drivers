import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Verifies that `@/db` never touches Postgres at import time. Next.js
 * evaluates every module reachable from the root layout while collecting
 * page data at build time (e.g. for /_not-found), so an eager connection
 * here would make `DATABASE_URL` a hard requirement just to run
 * `next build`. See src/db/index.ts for the fix.
 */

const createClient = vi.fn(() => ({ __client: true }));
const drizzleInstance = { __drizzle: true };
const drizzleFn = vi.fn(() => drizzleInstance);

vi.mock("postgres", () => ({
  default: (...args: unknown[]) => createClient(...(args as [])),
}));

vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: (...args: unknown[]) => drizzleFn(...(args as [])),
}));

beforeEach(() => {
  vi.resetModules();
  createClient.mockClear();
  drizzleFn.mockClear();
  delete process.env.DATABASE_URL;
  // The module caches the client/instance on globalThis; clear it so each
  // test starts from a clean slate regardless of module cache resets.
  delete (globalThis as Record<string, unknown>).vipDriversSql;
  delete (globalThis as Record<string, unknown>).vipDriversDb;
});

describe("@/db lazy initialization", () => {
  it("does not construct the client or drizzle instance on import", async () => {
    await import("@/db");
    expect(createClient).not.toHaveBeenCalled();
    expect(drizzleFn).not.toHaveBeenCalled();
  });

  it("throws only when the db proxy is actually used, without DATABASE_URL", async () => {
    const { db } = await import("@/db");
    expect(() => db.select).toThrow(/Missing required environment variable DATABASE_URL/);
  });

  it("constructs and caches the client lazily once DATABASE_URL is set", async () => {
    process.env.DATABASE_URL = "******localhost:5432/db";
    const { db, sql } = await import("@/db");

    expect(createClient).not.toHaveBeenCalled();
    expect(drizzleFn).not.toHaveBeenCalled();

    void db.select;
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(drizzleFn).toHaveBeenCalledTimes(1);

    void sql.end;
    // Reuses the already-created client rather than opening a second pool.
    expect(createClient).toHaveBeenCalledTimes(1);

    void db.insert;
    // Reuses the already-created drizzle instance.
    expect(drizzleFn).toHaveBeenCalledTimes(1);
  });
});
