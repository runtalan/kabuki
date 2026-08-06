// Standard fixed-rate amortization math — no DB access, pure functions so
// both the Properties pages and the standalone calculators share one
// implementation instead of drifting.

export function calculateMonthlyPayment(
  principal: number,
  annualRatePct: number,
  termYears: number
): number {
  const monthlyRate = annualRatePct / 100 / 12;
  const numPayments = termYears * 12;
  if (monthlyRate === 0) return principal / numPayments;
  const factor = Math.pow(1 + monthlyRate, numPayments);
  return (principal * monthlyRate * factor) / (factor - 1);
}

export function calculateRemainingBalance(
  principal: number,
  annualRatePct: number,
  termYears: number,
  paymentsMade: number
): number {
  const monthlyRate = annualRatePct / 100 / 12;
  const numPayments = termYears * 12;
  const clampedPayments = Math.min(Math.max(paymentsMade, 0), numPayments);
  if (monthlyRate === 0) {
    return Math.max(principal - (principal / numPayments) * clampedPayments, 0);
  }
  const payment = calculateMonthlyPayment(principal, annualRatePct, termYears);
  const factor = Math.pow(1 + monthlyRate, clampedPayments);
  const balance = principal * factor - payment * ((factor - 1) / monthlyRate);
  return Math.max(balance, 0);
}

export function monthsElapsedSince(startDate: Date, asOf: Date = new Date()): number {
  const months =
    (asOf.getFullYear() - startDate.getFullYear()) * 12 +
    (asOf.getMonth() - startDate.getMonth());
  return Math.max(months, 0);
}

export interface AmortizationRow {
  month: number;
  payment: number;
  principalPaid: number;
  interestPaid: number;
  balance: number;
}

export function buildAmortizationSchedule(
  principal: number,
  annualRatePct: number,
  termYears: number
): AmortizationRow[] {
  const monthlyRate = annualRatePct / 100 / 12;
  const numPayments = termYears * 12;
  const payment = calculateMonthlyPayment(principal, annualRatePct, termYears);
  const rows: AmortizationRow[] = [];
  let balance = principal;

  for (let month = 1; month <= numPayments; month++) {
    const interestPaid = balance * monthlyRate;
    const principalPaid = Math.min(payment - interestPaid, balance);
    balance = Math.max(balance - principalPaid, 0);
    rows.push({ month, payment, principalPaid, interestPaid, balance });
  }

  return rows;
}

export interface PayoffComparison {
  originalMonths: number;
  originalTotalInterest: number;
  newMonths: number;
  newTotalInterest: number;
  monthsSaved: number;
  interestSaved: number;
}

export function calculatePayoffWithExtra(
  principal: number,
  annualRatePct: number,
  termYears: number,
  extraMonthly: number
): PayoffComparison {
  const monthlyRate = annualRatePct / 100 / 12;
  const basePayment = calculateMonthlyPayment(principal, annualRatePct, termYears);
  const originalMonths = termYears * 12;
  const originalTotalInterest = basePayment * originalMonths - principal;

  if (extraMonthly <= 0) {
    return {
      originalMonths,
      originalTotalInterest,
      newMonths: originalMonths,
      newTotalInterest: originalTotalInterest,
      monthsSaved: 0,
      interestSaved: 0,
    };
  }

  const totalPayment = basePayment + extraMonthly;
  let balance = principal;
  let newMonths = 0;
  let newTotalInterest = 0;

  while (balance > 0.01 && newMonths < originalMonths) {
    const interestPaid = balance * monthlyRate;
    const principalPaid = Math.min(totalPayment - interestPaid, balance);
    balance = Math.max(balance - principalPaid, 0);
    newTotalInterest += interestPaid;
    newMonths++;
  }

  return {
    originalMonths,
    originalTotalInterest,
    newMonths,
    newTotalInterest,
    monthsSaved: originalMonths - newMonths,
    interestSaved: originalTotalInterest - newTotalInterest,
  };
}
