import { getUser } from '@/lib/auth';
import { db } from '@/db';
import { plaidItems, accounts, transactions, transactionTags } from '@/db/schema';
import { eq, inArray, and, or, ilike, asc, desc, isNull } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const categoryId = searchParams.get('category');
    const owner = searchParams.get('owner');
    const type = searchParams.get('type');
    const tagId = searchParams.get('tag');
    const accountId = searchParams.get('accountId');
    const sortBy = searchParams.get('sortBy') === 'amount' ? 'amount' : 'date';
    const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = 50;
    const offset = (page - 1) * pageSize;

    const userItems = await db.query.plaidItems.findMany({
      where: eq(plaidItems.userId, user.id),
    });

    const itemIds = userItems.map((item) => item.id);
    if (itemIds.length === 0) {
      return Response.json({ transactions: [], hasMore: false, total: 0 });
    }

    const userAccounts = await db.query.accounts.findMany({
      where: inArray(accounts.plaidItemId, itemIds),
    });

    let accountIds = userAccounts.map((acc) => acc.id);
    if (owner) {
      accountIds = userAccounts
        .filter((acc) => (acc.owner || 'joint') === owner)
        .map((acc) => acc.id);
    }
    if (accountId) {
      accountIds = accountIds.filter((id) => id === accountId);
    }
    if (accountIds.length === 0) {
      return Response.json({ transactions: [], hasMore: false, total: 0 });
    }

    const conditions = [inArray(transactions.accountId, accountIds)];
    if (q) {
      conditions.push(
        or(ilike(transactions.name, `%${q}%`), ilike(transactions.merchant, `%${q}%`))!
      );
    }
    if (categoryId === 'uncategorized') {
      conditions.push(isNull(transactions.categoryId));
    } else if (categoryId) {
      conditions.push(eq(transactions.categoryId, categoryId));
    }
    if (type === 'debit' || type === 'credit') {
      conditions.push(eq(transactions.type, type));
    }
    if (tagId) {
      const tagged = await db.query.transactionTags.findMany({
        where: eq(transactionTags.tagId, tagId),
      });
      const taggedIds = tagged.map((t) => t.transactionId);
      if (taggedIds.length === 0) {
        return Response.json({ transactions: [], hasMore: false, total: 0 });
      }
      conditions.push(inArray(transactions.id, taggedIds));
    }

    const orderColumn = sortBy === 'amount' ? transactions.amount : transactions.date;
    const orderFn = sortDir === 'asc' ? asc : desc;

    // Fetch one extra to determine if there are more results
    const userTransactions = await db.query.transactions.findMany({
      where: and(...conditions),
      with: {
        category: true,
        account: {
          columns: { id: true, name: true, displayName: true, owner: true, mask: true, isManual: true },
        },
        tags: { with: { tag: true } },
      },
      orderBy: orderFn(orderColumn),
      limit: pageSize + 1,
      offset,
    });

    const hasMore = userTransactions.length > pageSize;
    const paginatedTransactions = userTransactions.slice(0, pageSize);

    return Response.json({
      transactions: paginatedTransactions.map((tx) => ({
        ...tx,
        tags: tx.tags.map((t) => t.tag),
      })),
      hasMore,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return Response.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
