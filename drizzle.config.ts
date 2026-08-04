import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });

const dbUrl = process.env.DATABASE_URL || "";
const urlWithSSL = dbUrl.includes("sslmode") ? dbUrl : `${dbUrl}?sslmode=disable`;

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: urlWithSSL,
  },
  strict: true,
  verbose: true,
});
