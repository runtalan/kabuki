'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Settings,
  Wand2,
  X,
  Sparkles,
  Clock3,
  SlidersHorizontal,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { PageTabs, SPENDING_TABS } from '@/components/page-tabs';
import { CategoryIcon } from '@/components/category-icon';
import { OwnerBadge, getOwner, OWNERS } from '@/components/owner-badge';
import { AccountBadge } from '@/components/account-badge';
import { TransactionEditModal } from '@/components/transaction-edit-modal';
import { formatCurrency } from '@/lib/format';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface TagInfo {
  id: string;
  name: string;
  color: string;
}

interface Transaction {
  id: string;
  name: string;
  merchant?: string | null;
  amount: string;
  type: 'debit' | 'credit';
  date: string;
  pending?: boolean;
  hidden?: boolean;
  categoryId?: string | null;
  categorySource?: 'manual' | 'rule' | 'smart' | null;
  category?: Category | null;
  ownerOverride?: string | null;
  tags?: TagInfo[];
  account?: {
    id: string;
    name: string;
    displayName?: string | null;
    owner?: string | null;
    mask?: string | null;
    isManual?: boolean | null;
  } | null;
}

function dayLabel(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function groupByDay(transactions: Transaction[]) {
  const groups: { label: string; items: Transaction[] }[] = [];
  const indexByLabel = new Map<string, number>();

  for (const tx of transactions) {
    const label = dayLabel(tx.date);
    if (!indexByLabel.has(label)) {
      indexByLabel.set(label, groups.length);
      groups.push({ label, items: [] });
    }
    groups[indexByLabel.get(label)!].items.push(tx);
  }
  return groups;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedOwner, setSelectedOwner] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [allTags, setAllTags] = useState<TagInfo[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('all');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Date range state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');

  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

  // Rule modal state
  const [ruleModalTx, setRuleModalTx] = useState<Transaction | null>(null);
  const [ruleForm, setRuleForm] = useState({
    merchantName: '',
    matchType: 'contains' as 'exact' | 'contains' | 'startsWith',
    categoryId: '',
    applyNow: true,
  });
  const [savingRule, setSavingRule] = useState(false);
  const [smartTagging, setSmartTagging] = useState(false);

  const fetchTransactions = useCallback(
    async (opts: { silent?: boolean; loadMore?: boolean; pageNum?: number } = {}) => {
      if (!opts.silent && !opts.loadMore) setLoading(true);
      if (opts.loadMore) setLoadingMore(true);
      setSearching(true);
      try {
        const params = new URLSearchParams();
        if (searchInput.trim()) params.set('q', searchInput.trim());
        if (selectedCategory !== 'all') params.set('category', selectedCategory);
        if (selectedOwner !== 'all') params.set('owner', selectedOwner);
        if (selectedType !== 'all') params.set('type', selectedType);
        if (selectedTag !== 'all') params.set('tag', selectedTag);
        params.set('sortBy', sortBy);
        params.set('sortDir', sortDir);
        params.set('page', (opts.pageNum || 1).toString());

        const res = await fetch(`/api/transactions?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (opts.loadMore) {
            setTransactions((prev) => [...prev, ...(data.transactions || [])]);
          } else {
            setTransactions(data.transactions || []);
          }
          setHasMore(data.hasMore || false);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
        setSearching(false);
        setLoadingMore(false);
      }
    },
    [searchInput, selectedCategory, selectedOwner, selectedType, selectedTag, sortBy, sortDir]
  );

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTransactions({ loadMore: true, pageNum: nextPage });
  };

  // Debounce free-text search hitting the backend; other filters refetch immediately.
  useEffect(() => {
    const handle = setTimeout(() => fetchTransactions({ silent: true }), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
    setTransactions([]);
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedOwner, selectedType, selectedTag, sortBy, sortDir]);

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setCategories(data.categories || []));
    fetch('/api/tags')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setAllTags(data.tags || []));
  }, []);

  const toggleSort = (col: 'date' | 'amount') => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  const handleSmartTag = async () => {
    setSmartTagging(true);
    try {
      const response = await fetch('/api/transactions/smart-tag', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        await fetchTransactions();
        alert(
          data.tagged > 0
            ? `✨ Smart-tagged ${data.tagged} transaction${data.tagged === 1 ? '' : 's'} based on merchant patterns.`
            : 'No untagged transactions matched a known merchant pattern.'
        );
      }
    } catch (error) {
      console.error('Smart tagging failed:', error);
    } finally {
      setSmartTagging(false);
    }
  };

  const toggleHidden = async (tx: Transaction) => {
    const nextHidden = !tx.hidden;
    setTransactions((prev) =>
      prev.map((t) => (t.id === tx.id ? { ...t, hidden: nextHidden } : t))
    );
    try {
      await fetch(`/api/transactions/${tx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: nextHidden }),
      });
    } catch (error) {
      console.error('Failed to toggle hidden:', error);
    }
  };

  const filterByCategory = (categoryId: string | null) => {
    if (categoryId === null) {
      setSelectedCategory('all');
    } else {
      setSelectedCategory(categoryId);
    }
  };

  const openRuleModal = (tx: Transaction) => {
    setRuleModalTx(tx);
    setRuleForm({
      merchantName: tx.merchant || tx.name,
      matchType: 'contains',
      categoryId: tx.categoryId || '',
      applyNow: true,
    });
  };

  const handleSaveRule = async () => {
    if (!ruleModalTx || !ruleForm.merchantName.trim() || !ruleForm.categoryId) return;
    setSavingRule(true);
    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantName: ruleForm.merchantName.trim(),
          matchType: ruleForm.matchType,
          categoryId: ruleForm.categoryId,
        }),
      });

      if (response.ok) {
        if (ruleForm.applyNow) {
          await fetch('/api/transactions/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionId: ruleModalTx.id, categoryId: ruleForm.categoryId }),
          });
          const category = categories.find((c) => c.id === ruleForm.categoryId) || null;
          setTransactions((prev) =>
            prev.map((tx) =>
              tx.id === ruleModalTx.id ? { ...tx, categoryId: ruleForm.categoryId, category } : tx
            )
          );
        }
        setRuleModalTx(null);
      }
    } catch (error) {
      console.error('Failed to create rule:', error);
    } finally {
      setSavingRule(false);
    }
  };

  const getTimeRangeDate = () => {
    const now = new Date();
    if (timeRange === 'week') {
      const date = new Date(now);
      date.setDate(date.getDate() - 7);
      return date;
    }
    if (timeRange === 'month') {
      const date = new Date(now);
      date.setMonth(date.getMonth() - 1);
      return date;
    }
    if (customDateStart) {
      return new Date(customDateStart);
    }
    return new Date(0);
  };

  const getTimeRangeEndDate = () => {
    if (customDateEnd) {
      return new Date(customDateEnd);
    }
    return new Date();
  };

  const visibleTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    const startDate = getTimeRangeDate();
    const endDate = getTimeRangeEndDate();
    return txDate >= startDate && txDate <= endDate;
  });
  const groups = groupByDay(visibleTransactions);

  const dateRangeLabel = (() => {
    if (visibleTransactions.length === 0) return '—';
    const dates = visibleTransactions.map((tx) => new Date(tx.date).getTime());
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${fmt(min)} - ${fmt(max)}`;
  })();

  const stats = {
    total: visibleTransactions.length,
    dateRangeLabel,
    income: visibleTransactions
      .filter((tx) => tx.type === 'credit')
      .reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0),
    expenses: visibleTransactions
      .filter((tx) => tx.type === 'debit')
      .reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0),
  };

  const SortLabel = ({ col, children }: { col: 'date' | 'amount'; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(col)}
      className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
      {sortBy === col &&
        (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
    </button>
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="p-4 md:p-8">
          <p className="text-muted-foreground">Loading transactions...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">Spending</h1>
        <PageTabs tabs={SPENDING_TABS} />

        {/* Toolbar */}
        <div className="bg-card border border-border rounded-xl mb-4 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Transactions
            </p>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-52 pl-9 pr-8 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {searching ? (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  searchInput && (
                    <button
                      onClick={() => setSearchInput('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )
                )}
              </div>
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                className={`p-2 rounded-lg border transition-colors ${
                  filtersOpen
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                title="Filters"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              <button
                onClick={handleSmartTag}
                disabled={smartTagging}
                className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                title="Smart Tag — auto-tag untagged transactions using merchant patterns"
              >
                <Sparkles className={`w-4 h-4 ${smartTagging ? 'animate-pulse text-primary' : ''}`} />
              </button>
            </div>
          </div>

          {/* Summary stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-border divide-x divide-border">
            <div className="px-5 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                Total transactions
              </p>
              <p className="text-sm font-semibold text-foreground">{stats.total}</p>
            </div>
            <div className="px-5 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                Date range
              </p>
              <p className="text-sm font-semibold text-foreground truncate">{stats.dateRangeLabel}</p>
            </div>
            <div className="px-5 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                Total expenses
              </p>
              <p className="text-sm font-semibold text-foreground">-{formatCurrency(stats.expenses)}</p>
            </div>
            <div className="px-5 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                Total income
              </p>
              <p className="text-sm font-semibold text-emerald-500">+{formatCurrency(stats.income)}</p>
            </div>
          </div>

          {/* Collapsible filter panel */}
          {filtersOpen && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 px-5 py-4 border-t border-border bg-muted/20">
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={selectedOwner}
                  onChange={(e) => setSelectedOwner(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
                >
                  <option value="all">Everyone</option>
                  <option value="renato">{OWNERS.renato.emoji} Renato</option>
                  <option value="claudia">{OWNERS.claudia.emoji} Claudia</option>
                  <option value="joint">{OWNERS.joint.emoji} Joint</option>
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="debit">Expenses</option>
                  <option value="credit">Income</option>
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={timeRange}
                  onChange={(e) => {
                    const val = e.target.value as 'week' | 'month' | 'all' | 'custom';
                    if (val === 'custom') {
                      setShowDatePicker(true);
                    } else {
                      setTimeRange(val);
                      setShowDatePicker(false);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
                >
                  <option value="all">All Time</option>
                  <option value="month">This Month</option>
                  <option value="week">This Week</option>
                  <option value="custom">Custom Range</option>
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
                >
                  <option value="all">All Tags</option>
                  {allTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Custom Date Range Info */}
        {customDateStart && customDateEnd && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-blue-500/5 border border-blue-500/20 flex items-center justify-between">
            <p className="text-sm text-foreground">
              Custom date range:{' '}
              <span className="font-semibold">
                {new Date(customDateStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} -{' '}
                {new Date(customDateEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </p>
            <button
              onClick={() => {
                setCustomDateStart('');
                setCustomDateEnd('');
                setTimeRange('all');
              }}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Clear
            </button>
          </div>
        )}

        {/* Tag total, when a tag filter is active */}
        {selectedTag !== 'all' && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between">
            <p className="text-sm text-foreground">
              Showing transactions tagged{' '}
              <span className="font-semibold">
                {allTags.find((t) => t.id === selectedTag)?.name}
              </span>
            </p>
            <p className="text-sm font-semibold text-foreground">
              Total: $
              {transactions
                .reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0)
                .toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}

        {/* Date Range Picker Modal */}
        {showDatePicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowDatePicker(false)}
            />
            <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Select Date Range</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase mb-2 block">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customDateStart}
                    onChange={(e) => setCustomDateStart(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase mb-2 block">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customDateEnd}
                    onChange={(e) => setCustomDateEnd(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => {
                      if (customDateStart && customDateEnd) {
                        setTimeRange('all');
                        setShowDatePicker(false);
                        // Custom range is applied via the getTimeRangeDate logic
                      }
                    }}
                    disabled={!customDateStart || !customDateEnd}
                    className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => {
                      setShowDatePicker(false);
                      setCustomDateStart('');
                      setCustomDateEnd('');
                    }}
                    className="flex-1 px-4 py-2.5 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden mb-8">
          {/* Column headers */}
          <div className="hidden md:grid grid-cols-[1fr_180px_120px_140px_110px_60px] gap-3 px-5 py-2.5 border-b border-border bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Merchant / Description</span>
            <span>Category</span>
            <span>Account</span>
            <SortLabel col="date">Date</SortLabel>
            <SortLabel col="amount"><span className="ml-auto block text-right w-full">Amount</span></SortLabel>
            <span />
          </div>

          {groups.length > 0 ? (
            groups.map((group) => {
              const isCollapsed = collapsedDays.has(group.label);
              return (
                <div key={group.label}>
                  <button
                    onClick={() =>
                      setCollapsedDays((prev) => {
                        const next = new Set(prev);
                        if (next.has(group.label)) next.delete(group.label);
                        else next.add(group.label);
                        return next;
                      })
                    }
                    className="w-full flex items-center justify-between px-5 py-2 bg-muted/40 hover:bg-muted/60 transition-colors border-b border-border"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                      <span className="ml-2 text-muted-foreground/60 normal-case font-normal">
                        {group.items.length} transaction{group.items.length === 1 ? '' : 's'}
                      </span>
                    </p>
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {!isCollapsed &&
                    group.items.map((tx) => (
                      <div
                        key={tx.id}
                        onClick={() => setEditingTx(tx)}
                        className={`grid grid-cols-1 md:grid-cols-[1fr_180px_120px_140px_110px_60px] gap-3 items-center px-5 py-3 hover:bg-muted/30 transition-colors border-b border-border last:border-0 group cursor-pointer ${
                          tx.hidden ? 'opacity-50' : ''
                        }`}
                        style={{ borderLeft: `3px solid ${getOwner(tx.account?.owner).color}` }}
                      >
                        {/* Merchant / description */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              backgroundColor: (tx.category?.color || '#6b7280') + '1f',
                              color: tx.category?.color || '#6b7280',
                            }}
                          >
                            <CategoryIcon icon={tx.category?.icon} className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{tx.name}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              {tx.pending && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-amber-500">
                                  <Clock3 className="w-3 h-3" />
                                  Pending
                                </span>
                              )}
                              {tx.tags && tx.tags.length > 0 && (
                                <span className="flex items-center gap-1">
                                  {tx.tags.map((tag) => (
                                    <span
                                      key={tag.id}
                                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                      style={{ backgroundColor: tag.color + '1a', color: tag.color }}
                                    >
                                      {tag.name}
                                    </span>
                                  ))}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Category pill — filters the list, doesn't open the modal */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => filterByCategory(tx.categoryId || null)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full hover:opacity-80 transition-opacity max-w-full"
                            title="Filter by this category"
                          >
                            <CategoryIcon
                              icon={tx.category?.icon}
                              className="w-3.5 h-3.5 flex-shrink-0"
                              color={tx.category?.color}
                            />
                            <span
                              className="text-[11px] font-medium truncate"
                              style={{ color: tx.category?.color || '#9ca3af' }}
                            >
                              {tx.category?.name || 'Untagged'}
                            </span>
                            {tx.categorySource === 'smart' && (
                              <Sparkles className="w-2.5 h-2.5 opacity-60 flex-shrink-0" style={{ color: tx.category?.color }} />
                            )}
                          </button>
                        </div>

                        {/* Account */}
                        <div onClick={(e) => e.stopPropagation()} className="hidden md:block min-w-0">
                          {tx.account && (
                            <Link href={`/accounts/${tx.account.id}`} className="hover:underline inline-block">
                              <AccountBadge account={tx.account} />
                            </Link>
                          )}
                        </div>

                        {/* Date */}
                        <p className="hidden md:block text-xs text-muted-foreground">
                          {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>

                        {/* Amount */}
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleHidden(tx);
                            }}
                            className="p-1 rounded text-muted-foreground/50 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            title={tx.hidden ? 'Unhide transaction' : 'Hide transaction'}
                          >
                            {tx.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <p
                            className={`text-sm font-semibold text-right flex-shrink-0 ${
                              tx.type === 'credit' ? 'text-emerald-500' : 'text-foreground'
                            }`}
                          >
                            {tx.type === 'credit' ? '+' : ''}$
                            {Math.abs(parseFloat(tx.amount)).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                        </div>

                        {/* Cog — opens the transaction detail panel; Wand2 — create rule */}
                        <div onClick={(e) => e.stopPropagation()} className="flex justify-end gap-1">
                          <button
                            onClick={() => openRuleModal(tx)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                            title="Create rule from transaction"
                          >
                            <Wand2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingTx(tx)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Open transaction"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              );
            })
          ) : (
            <div className="px-6 py-12 text-center text-muted-foreground">
              No transactions found
            </div>
          )}
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center mb-8">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loadingMore ? 'Loading...' : 'Load More Transactions'}
            </button>
          </div>
        )}
      </div>

      {/* Create Rule Modal */}
      {ruleModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setRuleModalTx(null)}
          />
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6">
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" />
                Create Auto-Tag Rule
              </h2>
              <button
                onClick={() => setRuleModalTx(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Based on “{ruleModalTx.merchant || ruleModalTx.name}”
            </p>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm bg-muted/40 border border-border rounded-lg px-4 py-3">
                <span className="text-muted-foreground">If merchant</span>
                <select
                  value={ruleForm.matchType}
                  onChange={(e) =>
                    setRuleForm({
                      ...ruleForm,
                      matchType: e.target.value as 'exact' | 'contains' | 'startsWith',
                    })
                  }
                  className="px-2 py-1 rounded border border-border bg-background text-foreground text-sm"
                >
                  <option value="contains">contains</option>
                  <option value="exact">equals</option>
                  <option value="startsWith">starts with</option>
                </select>
                <input
                  type="text"
                  value={ruleForm.merchantName}
                  onChange={(e) => setRuleForm({ ...ruleForm, merchantName: e.target.value })}
                  className="flex-1 min-w-32 px-2 py-1 rounded border border-border bg-background text-foreground text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Then tag as</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setRuleForm({ ...ruleForm, categoryId: cat.id })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                        ruleForm.categoryId === cat.id
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border hover:bg-muted text-foreground'
                      }`}
                    >
                      <CategoryIcon icon={cat.icon} color={cat.color} className="w-4 h-4" />
                      <span className="truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={ruleForm.applyNow}
                  onChange={(e) => setRuleForm({ ...ruleForm, applyNow: e.target.checked })}
                  className="rounded border-border"
                />
                Also apply to this transaction now
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveRule}
                  disabled={savingRule || !ruleForm.merchantName.trim() || !ruleForm.categoryId}
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {savingRule ? 'Saving...' : 'Save Rule'}
                </button>
                <button
                  onClick={() => setRuleModalTx(null)}
                  className="px-4 py-2.5 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingTx && (
        <TransactionEditModal
          transaction={editingTx}
          categories={categories}
          onClose={() => setEditingTx(null)}
          onSaved={() => fetchTransactions({ silent: true })}
        />
      )}
    </AppLayout>
  );
}
