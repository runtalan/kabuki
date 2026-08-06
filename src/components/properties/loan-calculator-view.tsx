'use client';

import { useState } from 'react';
import { calculateMonthlyPayment, buildAmortizationSchedule } from '@/lib/loan-amortization';
import { formatCurrency } from '@/lib/format';
import { AmortizationTable } from './amortization-table';

export function LoanCalculatorView() {
  const [loanAmount, setLoanAmount] = useState(400000);
  const [annualRate, setAnnualRate] = useState(6.5);
  const [termYears, setTermYears] = useState(30);

  const monthlyPayment = calculateMonthlyPayment(loanAmount, annualRate, termYears);
  const totalPayments = monthlyPayment * termYears * 12;
  const totalInterest = totalPayments - loanAmount;
  const amortizationSchedule = buildAmortizationSchedule(loanAmount, annualRate, termYears);

  return (
    <div className="space-y-8">
      {/* Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border p-4 bg-card">
          <label htmlFor="loan-amount" className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Loan Amount
          </label>
          <input
            id="loan-amount"
            type="number"
            value={loanAmount}
            onChange={(e) => setLoanAmount(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="rounded-lg border border-border p-4 bg-card">
          <label htmlFor="annual-rate" className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Interest Rate (%)
          </label>
          <input
            id="annual-rate"
            type="number"
            step="0.1"
            value={annualRate}
            onChange={(e) => setAnnualRate(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="rounded-lg border border-border p-4 bg-card">
          <label htmlFor="term-years" className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Term (Years)
          </label>
          <input
            id="term-years"
            type="number"
            value={termYears}
            onChange={(e) => setTermYears(Math.max(1, parseFloat(e.target.value) || 1))}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border p-4 bg-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Monthly P&I Payment</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(monthlyPayment)}</p>
          <p className="text-xs text-muted-foreground mt-1">Per month</p>
        </div>

        <div className="rounded-lg border border-border p-4 bg-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Total Loan Cost</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalPayments)}</p>
          <p className="text-xs text-muted-foreground mt-1">Principal + interest</p>
        </div>

        <div className="rounded-lg border border-border p-4 bg-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Total Interest</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalInterest)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {((totalInterest / loanAmount) * 100).toFixed(1)}% of principal
          </p>
        </div>
      </div>

      {/* Amortization Table */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Amortization Schedule</h2>
        <AmortizationTable rows={amortizationSchedule} />
      </div>
    </div>
  );
}
