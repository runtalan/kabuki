'use client';

import { useState } from 'react';
import { Search, ChevronDown, Edit2, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { mockRecentTransactions } from '@/lib/mock-data';

const allCategories = [
  'All Categories',
  'Income',
  'Groceries',
  'Dining',
  'Transport',
  'Shopping',
  'Utilities',
  'Entertainment',
  'Other',
];

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');

  // Extended mock data for better demo
  const extendedTransactions = [
    ...mockRecentTransactions,
    {
      id: '6',
      name: 'Uber Trip',
      category: 'Transport',
      amount: -15.50,
      date: new Date(2024, 5, 23),
    },
    {
      id: '7',
      name: 'Gym Membership',
      category: 'Entertainment',
      amount: -50.00,
      date: new Date(2024, 5, 22),
    },
  ];

  const filteredTransactions = extendedTransactions
    .filter((tx) => {
      const matchesSearch = tx.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'All Categories' || tx.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'date') return b.date.getTime() - a.date.getTime();
      return Math.abs(b.amount) - Math.abs(a.amount);
    });

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Transactions</h1>
            <p className="text-muted-foreground">View and manage all your transactions</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer pr-10"
            >
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer pr-10"
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
            </select>
            <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                    Transaction
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                    Date
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-border hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-foreground font-medium">{tx.name}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{tx.category}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {tx.date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td
                        className={`px-6 py-4 text-sm font-semibold text-right ${
                          tx.amount >= 0 ? 'text-green-600' : 'text-foreground'
                        }`}
                      >
                        {tx.amount >= 0 ? '+' : ''} ${Math.abs(tx.amount).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <div className="flex justify-end gap-2">
                          <button className="p-2 hover:bg-muted/30 rounded transition-colors">
                            <Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                          </button>
                          <button className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors">
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Total Transactions</p>
            <p className="text-2xl font-bold text-foreground">{filteredTransactions.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Total Income</p>
            <p className="text-2xl font-bold text-green-600">
              ${filteredTransactions
                .filter((tx) => tx.amount >= 0)
                .reduce((sum, tx) => sum + tx.amount, 0)
                .toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Total Expenses</p>
            <p className="text-2xl font-bold text-red-600">
              ${filteredTransactions
                .filter((tx) => tx.amount < 0)
                .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
                .toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
