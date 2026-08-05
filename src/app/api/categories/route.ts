import { getUser } from '@/lib/auth';
import { db } from '@/db';
import { categories } from '@/db/schema';
import { generateId } from '@/lib/id';

export async function GET() {
  try {
    const allCategories = await db.query.categories.findMany({
      orderBy: (cat, { asc }) => asc(cat.name),
    });

    return Response.json({ categories: allCategories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return Response.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, color, icon } = await request.json();

    if (!name) {
      return Response.json({ error: 'Missing name' }, { status: 400 });
    }

    const result = await db
      .insert(categories)
      .values({
        id: generateId(),
        name,
        color: color || '#6366f1',
        icon: icon || 'folder',
        isCustom: true,
        createdAt: new Date(),
      })
      .returning();

    return Response.json(result[0]);
  } catch (error: any) {
    if (error.message?.includes('duplicate')) {
      return Response.json(
        { error: 'Category name already exists' },
        { status: 400 }
      );
    }
    console.error('Error creating category:', error);
    return Response.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
