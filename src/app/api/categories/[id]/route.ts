import { getUser, assertWriteAccess } from '@/lib/auth';
import { db } from '@/db';
import { categories } from '@/db/schema';
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
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const { id } = await params;
    const { name, color, icon, monthlyBudget } = await request.json();

    const existing = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    });

    if (!existing) {
      return Response.json({ error: 'Category not found' }, { status: 404 });
    }

    const result = await db
      .update(categories)
      .set({
        name: name?.trim() || existing.name,
        color: color || existing.color,
        icon: icon || existing.icon,
        // Budget: undefined = untouched, null/0 = cleared, number = set
        ...(monthlyBudget !== undefined && {
          monthlyBudget:
            monthlyBudget === null || Number(monthlyBudget) <= 0
              ? null
              : Number(monthlyBudget).toString(),
        }),
      })
      .where(eq(categories.id, id))
      .returning();

    return Response.json(result[0]);
  } catch (error: any) {
    if (error.message?.includes('duplicate') || error.cause?.code === '23505') {
      return Response.json(
        { error: 'A category with that name already exists' },
        { status: 400 }
      );
    }
    console.error('Error updating category:', error);
    return Response.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
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
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const { id } = await params;
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    });

    if (!category) {
      return Response.json({ error: 'Category not found' }, { status: 404 });
    }

    await db.delete(categories).where(eq(categories.id, id));

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return Response.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
