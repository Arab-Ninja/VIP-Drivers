/**
 * Loads .env.local for standalone scripts (seed, migrations).
 *
 * This lives in its own module because ES module imports are evaluated before
 * the importing module's body runs: calling dotenv inside seed.ts would happen
 * *after* the database client had already read process.env and thrown.
 * Importing this file first guarantees the variables exist in time.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });
