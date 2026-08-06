import { getUser, assertWriteAccess } from '@/lib/auth';
import { getAllProperties, createProperty, type PropertyInput } from '@/lib/properties';

const VALID_OWNERS = ['renato', 'claudia', 'joint'];

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const properties = await getAllProperties();
    return Response.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    return Response.json({ error: 'Failed to fetch properties' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const body = await request.json();
    const { name, address, owner, estimatedValue, originalLoanAmount, interestRate, loanTermYears, loanStartDate, notes } = body;

    if (typeof name !== 'string' || !name.trim()) {
      return Response.json({ error: 'name is required' }, { status: 400 });
    }
    if (!VALID_OWNERS.includes(owner)) {
      return Response.json({ error: 'invalid owner' }, { status: 400 });
    }
    if (
      typeof estimatedValue !== 'number' ||
      typeof originalLoanAmount !== 'number' ||
      typeof interestRate !== 'number' ||
      typeof loanTermYears !== 'number' ||
      typeof loanStartDate !== 'string'
    ) {
      return Response.json({ error: 'missing or invalid loan fields' }, { status: 400 });
    }

    const input: PropertyInput = {
      name: name.trim(),
      address: typeof address === 'string' ? address.trim() : null,
      owner,
      estimatedValue,
      originalLoanAmount,
      interestRate,
      loanTermYears,
      loanStartDate,
      notes: typeof notes === 'string' ? notes.trim() : null,
    };

    const id = await createProperty(input);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    console.error('Error creating property:', error);
    return Response.json({ error: 'Failed to create property' }, { status: 500 });
  }
}
