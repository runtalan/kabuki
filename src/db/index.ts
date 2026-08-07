import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

config({ path: ".env.local" });

// Use sandbox URL as default for build time, but runtime will override with real DATABASE_URL
const databaseUrl = process.env.DATABASE_URL || "postgresql://localhost/kabuki_sandbox";
const client = postgres(databaseUrl, {
  connect_timeout: 10,
  // Production's Supabase session pooler caps the whole project at 15
  // concurrent connections (see DATABASE.md). idle_timeout: 0 meant this
  // app's pool never released a connection once opened, so it could pin
  // up to `max` of those 15 slots permanently — starving migrations,
  // dashboards, and anything else that needs a session-mode connection.
  idle_timeout: 20,
  max: 5,
  max_lifetime: 60,
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
});

export const db = drizzle(client, { schema });
