import { getUser, assertWriteAccess } from '@/lib/auth';
import { runSmartCategorization } from '@/lib/auto-tag';

// Runs the built-in merchant knowledge base over the user's existing
// transactions. Never touches manually tagged or rule-tagged transactions —
// only fills in ones with no category, or a prior smart guess.
export async function POST() {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const tagged = await runSmartCategorization(user.id);
    return Response.json({ tagged });
  } catch (error) {
    console.error('Error running smart categorization:', error);
    return Response.json(
      { error: 'Failed to run smart categorization' },
      { status: 500 }
    );
  }
}
