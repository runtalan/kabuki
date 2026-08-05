import { getUser, assertWriteAccess } from '@/lib/auth';
import { db } from '@/db';
import { tags } from '@/db/schema';
import { generateId } from '@/lib/id';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allTags = await db.query.tags.findMany({
      orderBy: (tag, { asc }) => asc(tag.name),
    });

    return Response.json({ tags: allTags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return Response.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const { name, color } = await request.json();
    if (!name || !name.trim()) {
      return Response.json({ error: 'Name is required' }, { status: 400 });
    }

    const result = await db
      .insert(tags)
      .values({
        id: generateId(),
        name: name.trim(),
        color: color || '#6366f1',
        createdAt: new Date(),
      })
      .returning();

    return Response.json(result[0]);
  } catch (error: any) {
    if (error.cause?.code === '23505') {
      return Response.json({ error: 'A tag with that name already exists' }, { status: 400 });
    }
    console.error('Error creating tag:', error);
    return Response.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}
