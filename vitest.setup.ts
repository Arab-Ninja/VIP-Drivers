import { config } from "dotenv";

// Integration tests talk to the same Postgres the dev server uses.
config({ path: ".env.local" });
config({ path: ".env" });
