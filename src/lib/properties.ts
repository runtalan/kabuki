import { db } from '@/db';
import { properties, propertyValueHistory } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import { calculateMonthlyPayment, calculateRemainingBalance, monthsElapsedSince } from '@/lib/loan-amortization';

export interface PropertyInput {
  name: string;
  address?: string | null;
  owner: string;
  estimatedValue: number;
  originalLoanAmount: number;
  interestRate: number;
  loanTermYears: number;
  loanStartDate: string; // ISO date
  notes?: string | null;
}

export interface PropertyWithComputed {
  id: string;
  name: string;
  address: string | null;
  owner: string;
  estimatedValue: number;
  originalLoanAmount: number;
  interestRate: number;
  loanTermYears: number;
  loanStartDate: string;
  notes: string | null;
  monthlyPayment: number;
  remainingBalance: number;
  equity: number;
  payoffDate: string;
}

function withComputed(row: typeof properties.$inferSelect): PropertyWithComputed {
  const principal = Number(row.originalLoanAmount);
  const rate = Number(row.interestRate);
  const termYears = row.loanTermYears;
  const startDate = new Date(row.loanStartDate);
  const paymentsMade = monthsElapsedSince(startDate);
  const monthlyPayment = calculateMonthlyPayment(principal, rate, termYears);
  const remainingBalance = calculateRemainingBalance(principal, rate, termYears, paymentsMade);
  const estimatedValue = Number(row.estimatedValue);
  const payoffDate = new Date(startDate);
  payoffDate.setMonth(payoffDate.getMonth() + termYears * 12);

  return {
    id: row.id,
    name: row.name,
    address: row.address,
    owner: row.owner,
    estimatedValue,
    originalLoanAmount: principal,
    interestRate: rate,
    loanTermYears: termYears,
    loanStartDate: startDate.toISOString(),
    notes: row.notes,
    monthlyPayment,
    remainingBalance,
    equity: estimatedValue - remainingBalance,
    payoffDate: payoffDate.toISOString(),
  };
}

export async function getAllProperties(): Promise<PropertyWithComputed[]> {
  const rows = await db.query.properties.findMany({ orderBy: [asc(properties.createdAt)] });
  return rows.map(withComputed);
}

export async function getPropertyById(id: string): Promise<PropertyWithComputed | null> {
  const row = await db.query.properties.findFirst({ where: eq(properties.id, id) });
  return row ? withComputed(row) : null;
}

export async function createProperty(input: PropertyInput): Promise<string> {
  const id = generateId();
  const now = new Date();
  await db.insert(properties).values({
    id,
    name: input.name,
    address: input.address ?? null,
    owner: input.owner,
    estimatedValue: input.estimatedValue.toFixed(2),
    originalLoanAmount: input.originalLoanAmount.toFixed(2),
    interestRate: input.interestRate.toFixed(3),
    loanTermYears: input.loanTermYears,
    loanStartDate: new Date(input.loanStartDate),
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(propertyValueHistory).values({
    id: generateId(),
    propertyId: id,
    value: input.estimatedValue.toFixed(2),
    recordedAt: now,
  });
  return id;
}

export async function updateProperty(id: string, input: Partial<PropertyInput>): Promise<void> {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) updates.name = input.name;
  if (input.address !== undefined) updates.address = input.address;
  if (input.owner !== undefined) updates.owner = input.owner;
  if (input.estimatedValue !== undefined) updates.estimatedValue = input.estimatedValue.toFixed(2);
  if (input.originalLoanAmount !== undefined) updates.originalLoanAmount = input.originalLoanAmount.toFixed(2);
  if (input.interestRate !== undefined) updates.interestRate = input.interestRate.toFixed(3);
  if (input.loanTermYears !== undefined) updates.loanTermYears = input.loanTermYears;
  if (input.loanStartDate !== undefined) updates.loanStartDate = new Date(input.loanStartDate);
  if (input.notes !== undefined) updates.notes = input.notes;

  await db.update(properties).set(updates).where(eq(properties.id, id));

  if (input.estimatedValue !== undefined) {
    await db.insert(propertyValueHistory).values({
      id: generateId(),
      propertyId: id,
      value: input.estimatedValue.toFixed(2),
      recordedAt: new Date(),
    });
  }
}

export async function deleteProperty(id: string): Promise<void> {
  await db.delete(properties).where(eq(properties.id, id));
}

export interface EquitySeriesPoint {
  month: string;
  year: number;
  label: string;
  totalValue: number;
  totalLoanBalance: number;
  totalEquity: number;
}

export async function getCombinedEquitySeries(monthsBack: number = 6): Promise<EquitySeriesPoint[]> {
  const allProperties = await db.query.properties.findMany();
  if (allProperties.length === 0) return [];

  const historyByProperty = new Map<string, { value: number; recordedAt: Date }[]>();
  for (const property of allProperties) {
    const history = await db.query.propertyValueHistory.findMany({
      where: eq(propertyValueHistory.propertyId, property.id),
      orderBy: [asc(propertyValueHistory.recordedAt)],
    });
    historyByProperty.set(
      property.id,
      history.map((h) => ({ value: Number(h.value), recordedAt: h.recordedAt }))
    );
  }

  const now = new Date();
  const points: EquitySeriesPoint[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const asOf = new Date(now.getFullYear(), now.getMonth() - i, 1);
    let totalValue = 0;
    let totalLoanBalance = 0;

    for (const property of allProperties) {
      const history = historyByProperty.get(property.id) ?? [];
      const priorEntries = history.filter((h) => h.recordedAt <= asOf);
      const value = priorEntries.length > 0
        ? priorEntries[priorEntries.length - 1].value
        : Number(property.estimatedValue);

      const paymentsMade = monthsElapsedSince(new Date(property.loanStartDate), asOf);
      const balance = calculateRemainingBalance(
        Number(property.originalLoanAmount),
        Number(property.interestRate),
        property.loanTermYears,
        paymentsMade
      );

      totalValue += value;
      totalLoanBalance += balance;
    }

    points.push({
      month: String(asOf.getMonth() + 1).padStart(2, '0'),
      year: asOf.getFullYear(),
      label: asOf.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      totalValue,
      totalLoanBalance,
      totalEquity: totalValue - totalLoanBalance,
    });
  }

  return points;
}
