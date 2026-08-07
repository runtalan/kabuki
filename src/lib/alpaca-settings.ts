import { db } from "@/db";
import { alpacaSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function getAlpacaSettings(userId: string) {
  return await db.query.alpacaSettings.findFirst({
    where: eq(alpacaSettings.userId, userId),
  });
}

export async function saveAlpacaSettings(
  userId: string,
  apiKeyId: string,
  apiSecretKey: string
) {
  const existing = await getAlpacaSettings(userId);

  if (existing) {
    return await db
      .update(alpacaSettings)
      .set({
        apiKeyId,
        apiSecretKey,
        updatedAt: new Date(),
      })
      .where(eq(alpacaSettings.userId, userId));
  }

  return await db.insert(alpacaSettings).values({
    id: randomUUID(),
    userId,
    apiKeyId,
    apiSecretKey,
  });
}
