import { getUser } from '@/lib/auth';
import { findMatchingTransactions } from '@/lib/auto-tag';

// Dry-run for a rule: returns which existing transactions it would retag,
// without writing anything. Used by the create-rule wizard's "apply
// retroactively" preview.
export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { categoryId, merchantName, matchType } = await request.json();

    if (!categoryId || !merchantName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const matches = await findMatchingTransactions(user.id, {
      categoryId,
      merchantName,
      matchType: matchType || 'contains',
    });

    return Response.json({
      count: matches.length,
      transactions: matches
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((tx) => ({
          id: tx.id,
          name: tx.name,
          merchant: tx.merchant,
          amount: tx.amount,
          type: tx.type,
          date: tx.date,
          category: tx.category
            ? { name: tx.category.name, color: tx.category.color, icon: tx.category.icon }
            : null,
        })),
    });
  } catch (error) {
    console.error('Error previewing rule:', error);
    return Response.json({ error: 'Failed to preview rule' }, { status: 500 });
  }
}
