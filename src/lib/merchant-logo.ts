import sharp from "sharp";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { and, eq, isNotNull } from "drizzle-orm";

const BUCKET = "merchant-logos";
const MAX_DIMENSION = 128;

function publicLogoUrl(key: string) {
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${key}.png`;
}

async function uploadLogo(key: string, pngBytes: Buffer) {
  const res = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${key}.png`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      "Content-Type": "image/png",
      "x-upsert": "true",
    },
    body: new Uint8Array(pngBytes),
  });
  if (!res.ok) {
    throw new Error(`Supabase Storage upload failed: ${res.status} ${await res.text()}`);
  }
}

// Turns any arbitrary source string (Plaid doesn't always return
// merchant_entity_id) into a safe Storage object key.
export function slugifyMerchantKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

// Fetches a merchant's logo from Plaid's hosted logo_url, downsizes it to
// conserve storage, and caches it in Supabase Storage keyed by a stable
// per-merchant key (Plaid's merchant_entity_id when available, otherwise a
// slugified merchant name) so every transaction at the same merchant shares
// one cached image. Safe to call repeatedly — reuses any transaction that
// already cached this key before re-downloading from Plaid.
export async function cacheMerchantLogo(key: string, sourceLogoUrl: string): Promise<string | null> {
  const alreadyCached = await db.query.transactions.findFirst({
    where: and(eq(transactions.merchantEntityId, key), isNotNull(transactions.merchantLogoUrl)),
  });
  if (alreadyCached?.merchantLogoUrl) {
    return alreadyCached.merchantLogoUrl;
  }

  const sourceRes = await fetch(sourceLogoUrl);
  if (!sourceRes.ok) return null;
  const sourceBytes = Buffer.from(await sourceRes.arrayBuffer());

  const optimized = await sharp(sourceBytes)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();

  await uploadLogo(key, optimized);
  return publicLogoUrl(key);
}
