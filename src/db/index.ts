import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

config({ path: ".env.local" });

// Use sandbox URL as default for build time, but runtime will override with real DATABASE_URL
const databaseUrl = process.env.DATABASE_URL || "postgresql://localhost/kabuki_sandbox";
const client = postgres(databaseUrl, {
  connect_timeout: 10,
  idle_timeout: 0,
  max_lifetime: 60,
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
});

export const db = drizzle(client, { schema });
