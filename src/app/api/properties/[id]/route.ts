import { getUser, assertWriteAccess } from '@/lib/auth';
import { updateProperty, deleteProperty, type PropertyInput } from '@/lib/properties';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const { id } = await params;
    const body = await request.json();
    const updates: Partial<PropertyInput> = {};

    const validOwners = [...user.household.usernames, 'joint'];

    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
    if (body.address !== undefined) updates.address = typeof body.address === 'string' ? body.address.trim() : null;
    if (body.owner !== undefined) {
      if (!validOwners.includes(body.owner)) {
        return Response.json({ error: 'invalid owner' }, { status: 400 });
      }
      updates.owner = body.owner;
    }
    if (typeof body.estimatedValue === 'number') updates.estimatedValue = body.estimatedValue;
    if (typeof body.originalLoanAmount === 'number') updates.originalLoanAmount = body.originalLoanAmount;
    if (typeof body.interestRate === 'number') updates.interestRate = body.interestRate;
    if (typeof body.loanTermYears === 'number') updates.loanTermYears = body.loanTermYears;
    if (typeof body.loanStartDate === 'string') updates.loanStartDate = body.loanStartDate;
    if (body.notes !== undefined) updates.notes = typeof body.notes === 'string' ? body.notes.trim() : null;

    await updateProperty(id, updates);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error updating property:', error);
    return Response.json({ error: 'Failed to update property' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const demoBlock = assertWriteAccess(user);
    if (demoBlock) return demoBlock;

    const { id } = await params;
    await deleteProperty(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting property:', error);
    return Response.json({ error: 'Failed to delete property' }, { status: 500 });
  }
}
