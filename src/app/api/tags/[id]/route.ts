import { getUser } from '@/lib/auth';
import { db } from '@/db';
import { tags } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { name, color } = await request.json();

    const result = await db
      .update(tags)
      .set({
        ...(name?.trim() ? { name: name.trim() } : {}),
        ...(color ? { color } : {}),
      })
      .where(eq(tags.id, id))
      .returning();

    if (result.length === 0) {
      return Response.json({ error: 'Tag not found' }, { status: 404 });
    }

    return Response.json(result[0]);
  } catch (error: any) {
    if (error.cause?.code === '23505') {
      return Response.json({ error: 'A tag with that name already exists' }, { status: 400 });
    }
    console.error('Error updating tag:', error);
    return Response.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const result = await db.delete(tags).where(eq(tags.id, id)).returning();

    if (result.length === 0) {
      return Response.json({ error: 'Tag not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return Response.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}
