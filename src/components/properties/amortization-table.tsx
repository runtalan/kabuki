'use client';

import { useState } from 'react';
import { formatFullCurrency } from '@/lib/format';
import type { AmortizationRow } from '@/lib/loan-amortization';

interface AmortizationTableProps {
  rows: AmortizationRow[];
}

export function AmortizationTable({ rows }: AmortizationTableProps) {
  const [expanded, setExpanded] = useState(false);
  const displayRows = expanded ? rows : rows.slice(0, 12);

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-foreground text-xs">Month</th>
            <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Payment</th>
            <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Principal</th>
            <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Interest</th>
            <th className="px-4 py-3 text-right font-semibold text-foreground text-xs">Balance</th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-border hover:bg-muted/20 cursor-pointer transition-colors last:border-0"
            >
              <td className="px-4 py-3 font-semibold text-foreground">{row.month}</td>
              <td className="px-4 py-3 text-right text-foreground">{formatFullCurrency(row.payment)}</td>
              <td className="px-4 py-3 text-right text-foreground">{formatFullCurrency(row.principalPaid)}</td>
              <td className="px-4 py-3 text-right text-foreground">{formatFullCurrency(row.interestPaid)}</td>
              <td className="px-4 py-3 text-right font-semibold text-foreground">
                {formatFullCurrency(row.balance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length > 12 && (
        <div className="border-t border-border p-4 bg-muted/20">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline transition-colors"
          >
            {expanded ? 'Show less' : 'Show full schedule'} ({rows.length} months)
          </button>
        </div>
      )}
    </div>
  );
}
