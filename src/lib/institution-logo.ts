import { db } from "@/db";
import { plaidItems } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { plaidClient, plaidConfig } from "./plaid";

const BUCKET = "institution-logos";

function publicLogoUrl(institutionId: string) {
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${institutionId}.png`;
}

async function uploadLogo(institutionId: string, base64Png: string) {
  const bytes = Buffer.from(base64Png, "base64");
  const res = await fetch(
    `${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${institutionId}.png`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
        "Content-Type": "image/png",
        "x-upsert": "true",
      },
      body: bytes,
    }
  );
  if (!res.ok) {
    throw new Error(`Supabase Storage upload failed: ${res.status} ${await res.text()}`);
  }
}

// Fetches an institution's logo from Plaid and caches it in Supabase Storage,
// keyed by Plaid's institution_id so every household/user linking the same
// bank shares one cached image instead of re-fetching per plaid_item. Safe to
// call repeatedly — reuses the cached URL from any other plaid_item that
// already has this institution's logo before hitting Plaid again.
export async function cacheInstitutionLogo(institutionId: string): Promise<string | null> {
  const alreadyCached = await db.query.plaidItems.findFirst({
    where: and(eq(plaidItems.institutionId, institutionId), isNotNull(plaidItems.institutionLogoUrl)),
  });
  if (alreadyCached?.institutionLogoUrl) {
    return alreadyCached.institutionLogoUrl;
  }

  const response = await plaidClient.institutionsGetById({
    institution_id: institutionId,
    country_codes: plaidConfig.countryCodes,
    options: { include_optional_metadata: true },
  });

  const logo = response.data.institution.logo;
  if (!logo) return null;

  await uploadLogo(institutionId, logo);
  return publicLogoUrl(institutionId);
}
