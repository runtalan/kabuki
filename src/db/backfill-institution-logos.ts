// One-off backfill: existing plaid_items rows predate the institutionId
// column, so they need institution_id looked up from Plaid (via itemGet)
// before a logo can be cached for them. Safe to re-run — skips manual items
// and anything that already has a logo cached.
// TODO: household-aware — this script currently uses the default (renato-claudia) Plaid client
// for all items; if Mom & Pop's items need logo backfills, this script will fail for them.
import { db } from "./index";
import { plaidItems } from "./schema";
import { eq, isNull, and } from "drizzle-orm";
import { getPlaidClient, getPlaidConfig } from "../lib/plaid";
import { cacheInstitutionLogo } from "../lib/institution-logo";
import { CountryCode } from "plaid";

async function main() {
  const items = await db.query.plaidItems.findMany({
    where: and(eq(plaidItems.isManual, false), isNull(plaidItems.institutionLogoUrl)),
  });

  console.log(`Found ${items.length} item(s) needing a logo backfill.`);

  const plaidClient = getPlaidClient("");
  const plaidConfig = getPlaidConfig("");
  const countryCodes = plaidConfig.countryCodes as CountryCode[];

  for (const item of items) {
    try {
      let institutionId = item.institutionId;

      if (!institutionId) {
        const itemResponse = await plaidClient.itemGet({ access_token: item.accessToken });
        institutionId = itemResponse.data.item.institution_id || null;
      }

      if (!institutionId) {
        console.log(`  ${item.institutionName || item.id}: no institution_id from Plaid, skipping.`);
        continue;
      }

      const logoUrl = await cacheInstitutionLogo(plaidClient, countryCodes, institutionId);
      await db
        .update(plaidItems)
        .set({ institutionId, ...(logoUrl ? { institutionLogoUrl: logoUrl } : {}) })
        .where(eq(plaidItems.id, item.id));

      console.log(`  ${item.institutionName || item.id}: ${logoUrl ? "logo cached" : "no logo available"}`);
    } catch (err) {
      console.error(`  ${item.institutionName || item.id}: failed —`, err);
    }
  }

  process.exit(0);
}

main();
