'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Settings,
  Wand2,
  Tag,
  X,
  Check,
  Sparkles,
  Clock3,
} from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { PageTabs, SPENDING_TABS } from '@/components/page-tabs';
import { CategoryIcon } from '@/components/category-icon';
import { OwnerBadge, getOwner, OWNERS } from '@/components/owner-badge';
import { AccountBadge } from '@/components/account-badge';
import { TransactionEditModal } from '@/components/transaction-edit-modal';

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

  // Action menu state
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [recategorizingId, setRecategorizingId] = useState<string | null>(null);
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement | null>(null);

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
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true);
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

        const res = await fetch(`/api/transactions?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setTransactions(data.transactions || []);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
        setSearching(false);
      }
    },
    [searchInput, selectedCategory, selectedOwner, selectedType, selectedTag, sortBy, sortDir]
  );

  // Debounce free-text search hitting the backend; other filters refetch immediately.
  useEffect(() => {
    const handle = setTimeout(() => fetchTransactions({ silent: true }), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
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

  // Close action menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
        setRecategorizingId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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

  const handleUpdateCategory = async (transactionId: string, categoryId: string | null) => {
    try {
      const response = await fetch('/api/transactions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, categoryId }),
      });

      if (response.ok) {
        const category = categories.find((c) => c.id === categoryId) || null;
        setTransactions((prev) =>
          prev.map((tx) => (tx.id === transactionId ? { ...tx, categoryId, category } : tx))
        );
      }
    } catch (error) {
      console.error('Failed to update category:', error);
    } finally {
      setMenuOpenId(null);
      setRecategorizingId(null);
    }
  };

  const filterByCategory = (categoryId: string | null) => {
    if (categoryId === null) {
      setSelectedCategory('all');
    } else {
      setSelectedCategory(categoryId);
    }
  };

  const openRecategorize = (tx: Transaction) => {
    setMenuOpenId(tx.id);
    setRecategorizingId(tx.id);
  };

  const openRuleModal = (tx: Transaction) => {
    setMenuOpenId(null);
    setRecategorizingId(null);
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
          await handleUpdateCategory(ruleModalTx.id, ruleForm.categoryId);
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
    return new Date(0);
  };

  const visibleTransactions = transactions.filter(
    (tx) => new Date(tx.date) >= getTimeRangeDate()
  );
  const groups = groupByDay(visibleTransactions);

  const stats = {
    total: visibleTransactions.length,
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
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-muted-foreground">View and manage all your transactions</p>
          </div>
          <button
            onClick={handleSmartTag}
            disabled={smartTagging}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 shadow-sm hover:shadow-md transition-all"
            title="Auto-tag untagged transactions using merchant patterns (United Airlines → Travel, Whole Foods → Groceries, etc.)"
          >
            <Sparkles className={`w-4 h-4 ${smartTagging ? 'animate-pulse' : ''}`} />
            {smartTagging ? 'Analyzing...' : 'Smart Tag'}
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {searching && (
              <div className="absolute right-3 top-2.5 w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            )}
          </div>

          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
            >
              <option value="all">Everyone</option>
              <option value="renato">{OWNERS.renato.emoji} Renato</option>
              <option value="claudia">{OWNERS.claudia.emoji} Claudia</option>
              <option value="joint">{OWNERS.joint.emoji} Joint</option>
            </select>
            <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="debit">Expenses</option>
              <option value="credit">Income</option>
            </select>
            <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'all')}
              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="month">This Month</option>
              <option value="week">This Week</option>
            </select>
            <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
            >
              <option value="all">All Tags</option>
              {allTags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-muted-foreground pointer-events-none" />
          </div>
        </div>

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

        {/* Sort bar */}
        <div className="flex items-center justify-end gap-5 mb-3 px-1">
          <SortLabel col="date">Date</SortLabel>
          <SortLabel col="amount">Amount</SortLabel>
        </div>

        {/* Day-grouped transaction list */}
        <div className="space-y-5 mb-8">
          {groups.length > 0 ? (
            groups.map((group) => {
              const isCollapsed = collapsedDays.has(group.label);
              return (
                <div
                  key={group.label}
                  className="bg-card border border-border rounded-xl shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setCollapsedDays((prev) => {
                        const next = new Set(prev);
                        if (next.has(group.label)) next.delete(group.label);
                        else next.add(group.label);
                        return next;
                      })
                    }
                    className="w-full flex items-center justify-between px-5 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
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
                        className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors border-b border-border last:border-0 group"
                        style={{ borderLeft: `3px solid ${getOwner(tx.account?.owner).color}` }}
                      >
                        {/* Category avatar */}
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: (tx.category?.color || '#6b7280') + '1f',
                            color: tx.category?.color || '#6b7280',
                          }}
                        >
                          <CategoryIcon icon={tx.category?.icon} className="w-4 h-4" />
                        </div>

                        {/* Name + category pill + tags */}
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => setEditingTx(tx)}
                            className="text-sm font-medium text-foreground truncate hover:underline text-left block"
                            title="Click to edit transaction"
                          >
                            {tx.name}
                          </button>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  filterByCategory(tx.categoryId || null);
                                }}
                                className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
                                title="Filter by this category"
                              >
                                <span
                                  className="text-[11px] font-medium"
                                  style={{ color: tx.category?.color || '#9ca3af' }}
                                >
                                  {tx.category?.name || 'Untagged'}
                                </span>
                                {tx.categorySource === 'smart' && (
                                  <Sparkles className="w-2.5 h-2.5 opacity-60" style={{ color: tx.category?.color }} />
                                )}
                              </button>
                            </div>
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

                        {/* Account — links to the account's dedicated page */}
                        <div className="hidden md:block flex-shrink-0">
                          {tx.account && (
                            <Link
                              href={`/accounts/${tx.account.id}`}
                              className="hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <AccountBadge account={tx.account} />
                            </Link>
                          )}
                        </div>

                        {/* Owner */}
                        <div className="hidden sm:block flex-shrink-0">
                          <OwnerBadge owner={tx.account?.owner} />
                        </div>

                        {/* Pending */}
                        {tx.pending && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-amber-500 flex-shrink-0">
                            <Clock3 className="w-3 h-3" />
                            Pending
                          </span>
                        )}

                        {/* Amount */}
                        <p
                          className={`text-sm font-semibold text-right flex-shrink-0 w-24 ${
                            tx.type === 'credit' ? 'text-emerald-500' : 'text-foreground'
                          }`}
                        >
                          {tx.type === 'credit' ? '+' : ''}$
                          {Math.abs(parseFloat(tx.amount)).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </p>

                        {/* Actions */}
                        <div className="relative flex-shrink-0">
                          <button
                            onClick={() => {
                              setMenuOpenId(menuOpenId === tx.id ? null : tx.id);
                              setRecategorizingId(null);
                            }}
                            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                            title="Transaction actions"
                          >
                            <Settings className="w-4 h-4" />
                          </button>

                          {menuOpenId === tx.id && (
                            <div
                              ref={menuRef}
                              className="absolute right-0 top-11 z-30 w-64 bg-popover border border-border rounded-xl shadow-xl overflow-hidden text-left"
                            >
                              {recategorizingId !== tx.id ? (
                                <div className="py-1">
                                  <button
                                    onClick={() => openRecategorize(tx)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
                                  >
                                    <Tag className="w-4 h-4 text-muted-foreground" />
                                    Change category
                                  </button>
                                  <button
                                    onClick={() => openRuleModal(tx)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
                                  >
                                    <Wand2 className="w-4 h-4 text-muted-foreground" />
                                    Create rule from transaction
                                  </button>
                                </div>
                              ) : (
                                <div className="py-1 max-h-72 overflow-y-auto">
                                  <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Assign category
                                  </p>
                                  {categories.map((cat) => (
                                    <button
                                      key={cat.id}
                                      onClick={() => handleUpdateCategory(tx.id, cat.id)}
                                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left"
                                    >
                                      <CategoryIcon icon={cat.icon} color={cat.color} className="w-4 h-4" />
                                      <span className="flex-1">{cat.name}</span>
                                      {tx.categoryId === cat.id && <Check className="w-4 h-4 text-primary" />}
                                    </button>
                                  ))}
                                  <button
                                    onClick={() => handleUpdateCategory(tx.id, null)}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors text-left border-t border-border"
                                  >
                                    <X className="w-4 h-4" />
                                    Remove category
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              );
            })
          ) : (
            <div className="px-6 py-12 text-center text-muted-foreground bg-card border border-border rounded-xl">
              No transactions found
            </div>
          )}
        </div>

        {/* Stats Footer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Total Transactions</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Total Income</p>
            <p className="text-2xl font-bold text-emerald-500">
              ${stats.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Total Expenses</p>
            <p className="text-2xl font-bold text-red-500">
              ${stats.expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
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
