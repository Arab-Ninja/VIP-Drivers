/**
 * Connection-string sanitising.
 *
 * A Postgres URL carries two different kinds of query parameter: real server
 * settings, which are sent in the startup packet, and libpq *client* options,
 * which the C client consumes itself and never transmits. postgres.js
 * forwards anything it does not recognise, so a client-only parameter reaches
 * the server and is rejected outright:
 *
 *     unrecognized configuration parameter "channel_binding"
 *
 * That matters because the string Neon's dashboard hands you ends with
 * `&channel_binding=require`, and Supabase's ends with `?pgbouncer=true`. A
 * deployment would build cleanly and then fail on every request that touches
 * the database. Stripping these lets the operator paste the string exactly as
 * their provider gave it.
 */

/**
 * libpq client-side parameters that are not server settings. Deliberately a
 * denylist: genuine settings such as `application_name` and `options` must
 * keep working, and an allowlist would silently drop them.
 *
 * `sslmode`, `connect_timeout` and `target_session_attrs` are absent because
 * postgres.js handles those itself.
 */
const CLIENT_ONLY_PARAMS = new Set([
  "channel_binding",
  "gssencmode",
  "gssdelegation",
  "gsslib",
  "krbsrvname",
  "sslcert",
  "sslkey",
  "sslrootcert",
  "sslcrl",
  "sslcrldir",
  "sslsni",
  "sslcompression",
  "sslpassword",
  "sslnegotiation",
  "ssl_min_protocol_version",
  "ssl_max_protocol_version",
  "requiressl",
  "requirepeer",
  "passfile",
  "service",
  "servicefile",
  "load_balance_hosts",
  "keepalives",
  "keepalives_idle",
  "keepalives_interval",
  "keepalives_count",
  "tcp_user_timeout",
  "replication",
  // Not libpq, but Supabase appends it to pooled connection strings.
  "pgbouncer",
]);

/**
 * Removes parameters the driver cannot pass through, leaving everything else
 * untouched. Returns the original string unchanged when there is nothing to
 * strip, so a password with unusual characters is never re-encoded
 * needlessly.
 */
export function sanitiseConnectionString(connectionString: string): string {
  if (!connectionString.includes("?")) return connectionString;

  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    // Not a URL we can parse — a key/value DSN, say. Hand it over as is.
    return connectionString;
  }

  const removed: string[] = [];
  for (const key of [...parsed.searchParams.keys()]) {
    if (CLIENT_ONLY_PARAMS.has(key.toLowerCase())) {
      parsed.searchParams.delete(key);
      removed.push(key);
    }
  }

  if (removed.length === 0) return connectionString;

  // Worth a line in the logs: it explains a URL that does not match what the
  // operator pasted, if they ever go looking.
  console.info(
    `[db] ignoring client-only connection parameter(s): ${removed.join(", ")}`,
  );

  return parsed.toString();
}
