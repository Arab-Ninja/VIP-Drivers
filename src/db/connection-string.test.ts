import { describe, it, expect, vi, beforeEach } from "vitest";
import { sanitiseConnectionString } from "./connection-string";

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("sanitiseConnectionString", () => {
  it("strips the parameter Neon's dashboard appends", () => {
    // This exact shape is what the Neon copy button produces, and it made
    // every database query fail with:
    //   unrecognized configuration parameter "channel_binding"
    const neon =
      "postgresql://owner:pw@ep-x-pooler.eu-central-1.aws.neon.tech/neondb" +
      "?sslmode=require&channel_binding=require";

    const result = sanitiseConnectionString(neon);
    expect(result).not.toContain("channel_binding");
    expect(result).toContain("sslmode=require");
    expect(new URL(result).hostname).toBe("ep-x-pooler.eu-central-1.aws.neon.tech");
  });

  it("strips the parameter Supabase appends", () => {
    const supabase = "postgresql://postgres:pw@db.example.supabase.co:6543/postgres?pgbouncer=true";
    expect(sanitiseConnectionString(supabase)).not.toContain("pgbouncer");
  });

  it("keeps real server settings", () => {
    const url =
      "postgresql://u:p@host/db?application_name=vip-drivers&options=-c%20statement_timeout%3D5000";
    const result = sanitiseConnectionString(url);
    expect(result).toContain("application_name=vip-drivers");
    expect(result).toContain("options=");
  });

  it("keeps the options postgres.js handles itself", () => {
    const url = "postgresql://u:p@host/db?sslmode=require&connect_timeout=10&target_session_attrs=read-write";
    const result = sanitiseConnectionString(url);
    expect(result).toContain("sslmode=require");
    expect(result).toContain("connect_timeout=10");
    expect(result).toContain("target_session_attrs=read-write");
  });

  it("returns the string untouched when there is nothing to strip", () => {
    // Identity matters: re-encoding a URL could mangle a password containing
    // characters the URL parser normalises differently.
    const url = "postgresql://user:p%40ss%2Bword@host:5432/db?sslmode=require";
    expect(sanitiseConnectionString(url)).toBe(url);

    const noQuery = "postgresql://user:pass@host:5432/db";
    expect(sanitiseConnectionString(noQuery)).toBe(noQuery);
  });

  it("preserves a password with reserved characters while stripping", () => {
    const url = "postgresql://user:p%40ss%3Aword@host:5432/db?sslmode=require&channel_binding=require";
    const result = sanitiseConnectionString(url);
    expect(new URL(result).password).toBe(new URL(url).password);
    expect(result).not.toContain("channel_binding");
  });

  it("matches parameter names case-insensitively", () => {
    const url = "postgresql://u:p@host/db?Channel_Binding=require";
    expect(sanitiseConnectionString(url).toLowerCase()).not.toContain("channel_binding");
  });

  it("leaves an unparseable connection string alone", () => {
    const dsn = "host=localhost port=5432 dbname=vipdrivers?x";
    expect(sanitiseConnectionString(dsn)).toBe(dsn);
  });
});
