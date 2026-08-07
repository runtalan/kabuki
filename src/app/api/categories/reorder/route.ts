import { getUser } from '@/lib/auth';
import { db } from '@/db';
import { categories } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { categoryIds } = await request.json();

  if (!Array.isArray(categoryIds)) {
    return new Response('Invalid request: categoryIds must be an array', { status: 400 });
  }

  await Promise.all(
    categoryIds.map((id, index) =>
      db
        .update(categories)
        .set({ order: index })
        .where(eq(categories.id, id))
    )
  );

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
