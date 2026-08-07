import { db } from "../src/db";
import { watchlist, users } from "../src/db/schema";
import { eq } from "drizzle-orm";

const WATCHLIST_TICKERS = ["NVDA", "CRDO", "AAPL", "MSFT", "LLY"];

async function seedWatchlist() {
  try {
    // Find the primary user (usually first user in DB)
    const user = await db.query.users.findFirst();
    if (!user) {
      console.error("No user found. Seed a user first.");
      process.exit(1);
    }

    // Clear existing watchlist for this user
    await db
      .delete(watchlist)
      .where(eq(watchlist.userId, user.id));

    // Insert tickers
    await db.insert(watchlist).values(
      WATCHLIST_TICKERS.map((ticker) => ({
        userId: user.id,
        ticker,
      }))
    );

    console.log(`✅ Seeded ${WATCHLIST_TICKERS.length} tickers for user ${user.username}`);
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seedWatchlist();
