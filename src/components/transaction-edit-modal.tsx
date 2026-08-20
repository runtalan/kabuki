'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Loader, Search, Check, Eye, EyeOff, ChevronRight, Pencil, Wand2, Repeat } from 'lucide-react';
import { CategoryIcon } from './category-icon';
import { OWNERS, OwnerAvatar } from './owner-badge';
import { householdMemberEntries } from '@/lib/households';
import { useHousehold } from '@/hooks/use-household';
import { formatCurrency } from '@/lib/format';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { FREQUENCY_LABELS, type Frequency } from '@/lib/recurring-shared';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Tag {
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
  transferType?: 'transfer' | 'credit_card_payment' | null;
  categoryId?: string | null;
  ownerOverride?: string | null;
  notes?: string | null;
  account?: {
    owner?: string | null;
    name?: string;
    displayName?: string | null;
    mask?: string | null;
  } | null;
  tags?: Tag[];
}

interface TransactionEditModalProps {
  transaction: Transaction;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

export function TransactionEditModal({
  transaction,
  categories,
  onClose,
  onSaved,
}: TransactionEditModalProps) {
  const router = useRouter();
  const household = useHousehold();
  const [name, setName] = useState(transaction.name);
  const [type, setType] = useState<'debit' | 'credit'>(transaction.type);
  const [amount, setAmount] = useState(Math.abs(parseFloat(transaction.amount)).toString());
  const [date, setDate] = useState(new Date(transaction.date).toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState(transaction.categoryId || '');
  const [ownerOverride, setOwnerOverride] = useState(transaction.ownerOverride || '');
  const [hidden, setHidden] = useState(!!transaction.hidden);
  const [transferType, setTransferType] = useState<'transfer' | 'credit_card_payment' | null>(
    transaction.transferType || null
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    (transaction.tags || []).map((t) => t.id)
  );
  const [notes, setNotes] = useState(transaction.notes || '');

  const [recurring, setRecurring] = useState<{
    isRecurring: boolean;
    frequency: Frequency | null;
    intervalDays: number | null;
    nextDate: string | null;
    source: 'override' | 'detected' | null;
  } | null>(null);
  const [recurringLoading, setRecurringLoading] = useState(true);
  const [savingRecurring, setSavingRecurring] = useState(false);
  const [recurringError, setRecurringError] = useState('');
  const [editFrequency, setEditFrequency] = useState<Frequency>('monthly');
  const [editIntervalDays, setEditIntervalDays] = useState('30');
  const [editNextDate, setEditNextDate] = useState('');
  // Tracks which `recurring` snapshot the edit fields were last synced from
  // — adjusted during render (React's sanctioned alternative to an effect
  // here: https://react.dev/learn/you-might-not-need-an-effect) rather than
  // in a useEffect, since this is deriving state from a prop-like value.
  const [syncedRecurring, setSyncedRecurring] = useState<typeof recurring>(null);

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [categorySearch, setCategorySearch] = useState('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [ownerSectionOpen, setOwnerSectionOpen] = useState(false);
  const [editingBasics, setEditingBasics] = useState(false);
  const [visible, setVisible] = useState(false);

  const [ruleSectionOpen, setRuleSectionOpen] = useState(false);
  const [ruleMatchType, setRuleMatchType] = useState<'exact' | 'contains' | 'startsWith'>('contains');
  const [ruleMerchantName, setRuleMerchantName] = useState(transaction.merchant || transaction.name);
  const [ruleCategoryId, setRuleCategoryId] = useState(transaction.categoryId || '');
  const [ruleApplyNow, setRuleApplyNow] = useState(true);
  const [ruleRetroactive, setRuleRetroactive] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [ruleError, setRuleError] = useState('');
  const [ruleCreated, setRuleCreated] = useState(false);
  const [ruleCreatedMessage, setRuleCreatedMessage] = useState('');

  const tagBlurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoryBlurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/tags')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setAllTags(data.tags || []));
  }, []);

  useEffect(() => {
    fetch(`/api/transactions/${transaction.id}/recurring`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setRecurring(data);
      })
      .finally(() => setRecurringLoading(false));
  }, [transaction.id]);

  if (recurring?.isRecurring && recurring !== syncedRecurring) {
    setSyncedRecurring(recurring);
    setEditFrequency(recurring.frequency || 'monthly');
    setEditIntervalDays(recurring.intervalDays ? String(recurring.intervalDays) : '30');
    setEditNextDate(recurring.nextDate || '');
  }

  // Mount closed, then slide in — gives the transform a frame to animate from.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  // Escape closes the panel, unless an inline picker is open — then it just
  // dismisses the picker, so one Escape doesn't blow away the whole panel.
  useEscapeKey(() => {
    if (categoryDropdownOpen) return setCategoryDropdownOpen(false);
    if (tagDropdownOpen) return setTagDropdownOpen(false);
    if (ruleSectionOpen) return setRuleSectionOpen(false);
    handleClose();
  });

  const selectedCategory = categories.find((c) => c.id === categoryId) || null;
  const selectedTags = allTags.filter((t) => selectedTagIds.includes(t.id));
  const unselectedTags = allTags.filter((t) => !selectedTagIds.includes(t.id));
  const quickAddTags = unselectedTags.slice(0, 3);
  const filteredTagResults = tagSearch.trim()
    ? unselectedTags.filter((t) => t.name.toLowerCase().includes(tagSearch.trim().toLowerCase()))
    : [];
  const filteredCategoryResults = categorySearch.trim()
    ? categories.filter((c) => c.name.toLowerCase().includes(categorySearch.trim().toLowerCase()))
    : categories;

  const addTag = (tagId: string) => {
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev : [...prev, tagId]));
    setTagSearch('');
    setTagDropdownOpen(false);
  };

  const removeTag = (tagId: string) => {
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
  };

  const handleCreateTag = async () => {
    if (!tagSearch.trim()) return;
    setCreatingTag(true);
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagSearch.trim() }),
      });
      if (res.ok) {
        const tag = await res.json();
        setAllTags((prev) => [...prev, tag]);
        setSelectedTagIds((prev) => [...prev, tag.id]);
        setTagSearch('');
        setTagDropdownOpen(false);
      }
    } finally {
      setCreatingTag(false);
    }
  };

  const persist = async (
    overrides: Record<string, unknown> = {},
    opts: { silent?: boolean } = {}
  ) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          amount: parseFloat(amount),
          type,
          date,
          categoryId: categoryId || null,
          ownerOverride: ownerOverride || null,
          tagIds: selectedTagIds,
          hidden,
          transferType,
          notes,
          ...overrides,
        }),
      });
      if (res.ok) {
        // Silent persists (e.g. applying a category from a just-created rule)
        // update this transaction without triggering the parent's onSaved,
        // which every caller wires to close this whole panel — the user
        // should get to see the result, not have it vanish mid-confirmation.
        if (!opts.silent) onSaved();
        return true;
      }
      const data = await res.json();
      setError(data.error || 'Failed to save transaction');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !amount || Number.isNaN(parseFloat(amount))) {
      setError('Please enter a valid merchant and amount');
      return;
    }
    const ok = await persist();
    if (ok) handleClose();
  };

  const toggleHidden = async () => {
    const next = !hidden;
    setHidden(next);
    await persist({ hidden: next });
  };

  const changeTransferType = async (next: 'transfer' | 'credit_card_payment' | null) => {
    const value = transferType === next ? null : next;
    setTransferType(value);
    await persist({ transferType: value });
  };

  const handleCreateRule = async () => {
    if (!ruleMerchantName.trim() || !ruleCategoryId) return;
    setSavingRule(true);
    setRuleError('');
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantName: ruleMerchantName.trim(),
          matchType: ruleMatchType,
          categoryId: ruleCategoryId,
          retroactive: ruleRetroactive,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const messages: string[] = ['Rule created ✓'];
        if (ruleApplyNow) {
          setCategoryId(ruleCategoryId);
          // Silent — stay open so the confirmation below is actually seen;
          // refresh the underlying list ourselves instead of relying on
          // onSaved's close-the-panel side effect.
          const ok = await persist(
            { categoryId: ruleCategoryId, categorySource: 'rule' },
            { silent: true }
          );
          if (ok) {
            router.refresh();
            messages.push('category applied to this transaction');
          }
        }
        if (ruleRetroactive) {
          const retagged = data.retagged || 0;
          messages.push(`${retagged} past transaction${retagged === 1 ? '' : 's'} retagged`);
          if (retagged > 0) router.refresh();
        }
        setRuleSectionOpen(false);
        setRuleCreatedMessage(messages.join(' — '));
        setRuleCreated(true);
        setTimeout(() => setRuleCreated(false), 4000);
      } else {
        const data = await res.json();
        setRuleError(data.error || 'Failed to create rule');
      }
    } finally {
      setSavingRule(false);
    }
  };

  const toggleRecurring = async () => {
    if (!recurring || savingRecurring) return;
    const action = recurring.isRecurring ? 'dismiss' : 'confirm';
    const previous = recurring;
    setSavingRecurring(true);
    setRecurringError('');
    try {
      const res = await fetch(`/api/transactions/${transaction.id}/recurring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setRecurring(await res.json());
      } else {
        const data = await res.json();
        setRecurringError(data.error || 'Failed to update recurring status');
        setRecurring(previous);
      }
    } catch {
      setRecurringError('Failed to update recurring status');
      setRecurring(previous);
    } finally {
      setSavingRecurring(false);
    }
  };

  const saveFrequency = async (next: { frequency: Frequency; intervalDays?: number; nextDate: string }) => {
    if (savingRecurring) return;
    const previous = recurring;
    setSavingRecurring(true);
    setRecurringError('');
    try {
      const res = await fetch(`/api/transactions/${transaction.id}/recurring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', ...next }),
      });
      if (res.ok) {
        setRecurring(await res.json());
      } else {
        const data = await res.json();
        setRecurringError(data.error || 'Failed to update recurring status');
        setRecurring(previous);
      }
    } catch {
      setRecurringError('Failed to update recurring status');
      setRecurring(previous);
    } finally {
      setSavingRecurring(false);
    }
  };

  const accountLabel = transaction.account
    ? `${transaction.account.displayName || transaction.account.name || 'Account'}${
        transaction.account.mask ? ` ...${transaction.account.mask}` : ''
      }`
    : null;

  const rowClass =
    'w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-muted/40 transition-colors';

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl overflow-y-auto transition-transform duration-200 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <button
            onClick={handleClose}
            title="Close"
            className="p-1.5 -ml-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate px-2">
            {transaction.name}
          </p>
          <button
            onClick={() => setEditingBasics((v) => !v)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Edit merchant, amount, date"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        {/* Hero amount */}
        <div className="flex flex-col items-center gap-3 py-8 px-5 border-b border-border">
          {transaction.pending && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground">
              Pending
            </span>
          )}
          <p className={`text-4xl font-bold ${type === 'credit' ? 'text-emerald-500' : 'text-foreground'}`}>
            {type === 'credit' ? '+' : ''}
            {formatCurrency(parseFloat(amount || '0'))}
          </p>
          {hidden && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-medium">
              <EyeOff className="w-3 h-3" />
              Hidden from totals
            </span>
          )}
        </div>

        {/* Inline basics editor (merchant / amount / date) */}
        {editingBasics && (
          <div className="px-5 py-4 border-b border-border space-y-3 bg-muted/20">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Merchant / Description
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Amount</label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'debit' | 'credit')}
                    className="px-2 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  >
                    <option value="debit">−</option>
                    <option value="credit">+</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Field rows */}
        <div className="divide-y divide-border">
          {/* Date row (read view) */}
          <div className={rowClass}>
            <span className="text-sm text-foreground">Date</span>
            <span className="text-sm text-muted-foreground">
              {new Date(date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>

          {/* Description row */}
          <div className={rowClass}>
            <span className="text-sm text-foreground">Description</span>
            <span className="text-sm text-muted-foreground truncate max-w-[220px] text-right">
              {name}
            </span>
          </div>

          {/* Account / card row */}
          {accountLabel && (
            <div className={rowClass}>
              <span className="text-sm text-foreground">Card</span>
              <span className="text-sm text-muted-foreground truncate max-w-[220px] text-right">
                {accountLabel}
              </span>
            </div>
          )}

          {/* Category */}
          <div className="px-5 py-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-foreground">Category</span>
              {selectedCategory ? (
                <button
                  type="button"
                  onClick={() => setCategoryDropdownOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: selectedCategory.color + '1a', color: selectedCategory.color }}
                >
                  <CategoryIcon icon={selectedCategory.icon} className="w-3.5 h-3.5" />
                  {selectedCategory.name}
                  <ChevronRight className={`w-3 h-3 transition-transform ${categoryDropdownOpen ? 'rotate-90' : ''}`} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCategoryDropdownOpen((v) => !v)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Set category
                </button>
              )}
            </div>
            {categoryDropdownOpen && (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    autoFocus
                    onBlur={() => {
                      categoryBlurTimeout.current = setTimeout(() => setCategoryDropdownOpen(false), 150);
                    }}
                    onFocus={() => {
                      if (categoryBlurTimeout.current) clearTimeout(categoryBlurTimeout.current);
                    }}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  />
                </div>
                <div className="mt-1 max-h-48 overflow-y-auto bg-popover border border-border rounded-lg shadow-xl">
                  {filteredCategoryResults.length > 0 ? (
                    filteredCategoryResults.map((cat) => (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => {
                          setCategoryId(cat.id);
                          setCategorySearch('');
                          setCategoryDropdownOpen(false);
                          persist({ categoryId: cat.id });
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left"
                      >
                        <CategoryIcon icon={cat.icon} color={cat.color} className="w-4 h-4" />
                        <span className="flex-1 truncate">{cat.name}</span>
                        {categoryId === cat.id && <Check className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-sm text-muted-foreground">No matching categories</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Recurring */}
          <div className={rowClass}>
            <div className="flex-1 pr-3">
              <p className="text-sm text-foreground inline-flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-muted-foreground" />
                Recurring
              </p>
              {recurring?.isRecurring && recurring.frequency && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {recurring.source === 'detected' ? 'Auto-detected · ' : ''}
                  {recurring.frequency === 'custom'
                    ? `Every ${recurring.intervalDays} days`
                    : FREQUENCY_LABELS[recurring.frequency]}
                  {recurring.nextDate
                    ? ` · next ${new Date(`${recurring.nextDate}T00:00:00`).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}`
                    : ''}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">Applies only to this transaction.</p>
              {recurringError && <p className="text-xs text-red-500 mt-1">{recurringError}</p>}
              {recurring?.isRecurring && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    value={editFrequency}
                    onChange={(e) => {
                      const freq = e.target.value as Frequency;
                      setEditFrequency(freq);
                      if (freq !== 'custom') {
                        saveFrequency({ frequency: freq, nextDate: editNextDate || recurring.nextDate || '' });
                      }
                    }}
                    className="px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Annual</option>
                    <option value="custom">Other</option>
                  </select>
                  {editFrequency === 'custom' && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      every
                      <input
                        type="number"
                        min="1"
                        value={editIntervalDays}
                        onChange={(e) => setEditIntervalDays(e.target.value)}
                        onBlur={() => {
                          const days = parseInt(editIntervalDays, 10);
                          if (Number.isInteger(days) && days > 0) {
                            saveFrequency({
                              frequency: 'custom',
                              intervalDays: days,
                              nextDate: editNextDate || recurring.nextDate || '',
                            });
                          }
                        }}
                        className="w-14 px-1.5 py-1 rounded-lg border border-border bg-background text-foreground text-xs"
                      />
                      days
                    </span>
                  )}
                  <input
                    type="date"
                    value={editNextDate}
                    onChange={(e) => setEditNextDate(e.target.value)}
                    onBlur={() => {
                      if (!editNextDate) return;
                      saveFrequency(
                        editFrequency === 'custom'
                          ? {
                              frequency: 'custom',
                              intervalDays: parseInt(editIntervalDays, 10) || 30,
                              nextDate: editNextDate,
                            }
                          : { frequency: editFrequency, nextDate: editNextDate }
                      );
                    }}
                    className="px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs"
                  />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={toggleRecurring}
              disabled={recurringLoading || savingRecurring}
              role="switch"
              aria-checked={!!recurring?.isRecurring}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${
                recurring?.isRecurring ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  recurring?.isRecurring ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Auto-tag rule */}
          <div className="px-5 py-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-foreground inline-flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-muted-foreground" />
                Auto-tag rule
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!ruleSectionOpen) {
                    setRuleMerchantName(transaction.merchant || transaction.name);
                    setRuleCategoryId(categoryId);
                    setRuleRetroactive(false);
                  }
                  setRuleSectionOpen((v) => !v);
                }}
                className="text-xs font-medium text-primary hover:underline"
              >
                Create rule
              </button>
            </div>

            {ruleCreated && (
              <p className="text-xs text-emerald-500 font-medium">{ruleCreatedMessage}</p>
            )}

            {ruleSectionOpen && (
              <div className="space-y-3 mt-1">
                <div className="flex flex-wrap items-center gap-2 text-sm bg-muted/40 border border-border rounded-lg px-3 py-2.5">
                  <span className="text-muted-foreground">If merchant</span>
                  <select
                    value={ruleMatchType}
                    onChange={(e) => setRuleMatchType(e.target.value as 'exact' | 'contains' | 'startsWith')}
                    className="px-2 py-1 rounded border border-border bg-background text-foreground text-xs"
                  >
                    <option value="contains">contains</option>
                    <option value="exact">equals</option>
                    <option value="startsWith">starts with</option>
                  </select>
                  <input
                    type="text"
                    value={ruleMerchantName}
                    onChange={(e) => setRuleMerchantName(e.target.value)}
                    className="flex-1 min-w-24 px-2 py-1 rounded border border-border bg-background text-foreground text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Then tag as</label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {categories.map((cat) => (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setRuleCategoryId(cat.id)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs text-left transition-colors ${
                          ruleCategoryId === cat.id
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border hover:bg-muted text-foreground'
                        }`}
                      >
                        <CategoryIcon icon={cat.icon} color={cat.color} className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ruleApplyNow}
                    onChange={(e) => setRuleApplyNow(e.target.checked)}
                    className="rounded border-border"
                  />
                  Also apply to this transaction now
                </label>

                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ruleRetroactive}
                    onChange={(e) => setRuleRetroactive(e.target.checked)}
                    className="rounded border-border"
                  />
                  Also apply to matching transactions in the past
                </label>

                {ruleError && <p className="text-xs text-red-500">{ruleError}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateRule}
                    disabled={savingRule || !ruleMerchantName.trim() || !ruleCategoryId}
                    className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {savingRule ? 'Saving...' : 'Save Rule'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRuleSectionOpen(false)}
                    className="px-3 py-1.5 bg-muted text-foreground text-xs rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="px-5 py-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-foreground">Tags</span>
              <button
                type="button"
                onClick={() => setTagDropdownOpen((v) => !v)}
                className="text-xs font-medium text-primary hover:underline"
              >
                {selectedTags.length > 0 ? 'Edit' : 'Add tag'}
              </button>
            </div>

            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: tag.color, color: '#fff' }}
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => {
                        removeTag(tag.id);
                        persist({ tagIds: selectedTagIds.filter((id) => id !== tag.id) });
                      }}
                      className="hover:opacity-70 transition-opacity"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {tagDropdownOpen && (
              <div>
                {quickAddTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {quickAddTags.map((tag) => (
                      <button
                        type="button"
                        key={tag.id}
                        onClick={() => {
                          addTag(tag.id);
                          persist({ tagIds: [...selectedTagIds, tag.id] });
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all hover:opacity-80"
                        style={{ backgroundColor: tag.color + '15', borderColor: tag.color + '40', color: tag.color }}
                      >
                        <Plus className="w-3 h-3" />
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search or create a tag..."
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && filteredTagResults.length === 0 && tagSearch.trim()) {
                        e.preventDefault();
                        handleCreateTag();
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  />
                </div>
                {tagSearch.trim() && (
                  <div className="mt-1 max-h-40 overflow-y-auto bg-popover border border-border rounded-lg shadow-xl">
                    {filteredTagResults.map((tag) => (
                      <button
                        type="button"
                        key={tag.id}
                        onClick={() => {
                          addTag(tag.id);
                          persist({ tagIds: [...selectedTagIds, tag.id] });
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left"
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                        {tag.name}
                      </button>
                    ))}
                    {filteredTagResults.length === 0 && (
                      <button
                        type="button"
                        onClick={handleCreateTag}
                        disabled={creatingTag}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-muted transition-colors text-left disabled:opacity-50"
                      >
                        {creatingTag ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Create "{tagSearch.trim()}"
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Owner */}
          <div className="px-5 py-3.5">
            <button
              type="button"
              onClick={() => setOwnerSectionOpen((v) => !v)}
              className="w-full flex items-center justify-between"
            >
              <span className="text-sm text-foreground">Owner</span>
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                {ownerOverride ? (
                  <>
                    <OwnerAvatar owner={ownerOverride} className="w-4 h-4" />
                    {OWNERS[ownerOverride as keyof typeof OWNERS].label}
                  </>
                ) : (
                  `Account default (${OWNERS[(transaction.account?.owner as keyof typeof OWNERS) || 'joint'].label})`
                )}
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${ownerSectionOpen ? 'rotate-90' : ''}`} />
              </span>
            </button>
            {ownerSectionOpen && (
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setOwnerOverride('');
                    persist({ ownerOverride: null });
                  }}
                  className={`flex-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    ownerOverride === ''
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border hover:bg-muted text-muted-foreground'
                  }`}
                >
                  Default
                </button>
                {(household ? householdMemberEntries(household) : []).map(
                  ([value, info]) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => {
                        setOwnerOverride(value);
                        persist({ ownerOverride: value });
                      }}
                      className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        ownerOverride === value
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <OwnerAvatar owner={value} className="w-4 h-4" />
                      {info.label}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Hide transaction toggle */}
          <div className={rowClass}>
            <div>
              <p className="text-sm text-foreground">Hide transaction</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Excludes it from totals, budgets, and reports
              </p>
            </div>
            <button
              type="button"
              onClick={toggleHidden}
              disabled={saving}
              role="switch"
              aria-checked={hidden}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                hidden ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform flex items-center justify-center ${
                  hidden ? 'translate-x-5' : 'translate-x-0'
                }`}
              >
                {hidden ? (
                  <EyeOff className="w-3 h-3 text-primary" />
                ) : (
                  <Eye className="w-3 h-3 text-muted-foreground" />
                )}
              </span>
            </button>
          </div>

          {/* Transfer / credit card payment classification */}
          <div className={rowClass}>
            <div className="flex-1">
              <p
                className="text-sm text-foreground inline-flex items-center gap-1.5"
                title="Categorizing this as a transfer (like paying your credit card) ensures it won't count as an expense or income against your monthly budget."
              >
                Transfer
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Money moving between your own accounts — excluded from income, expenses, and
                budgets so it isn't double-counted (e.g. paying off a credit card).
              </p>
              <div className="inline-flex p-0.5 rounded-lg bg-muted border border-border mt-2">
                {(
                  [
                    { value: null, label: 'Normal' },
                    { value: 'transfer' as const, label: 'Transfer' },
                    { value: 'credit_card_payment' as const, label: 'Card payment' },
                  ]
                ).map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => changeTransferType(opt.value)}
                    disabled={saving}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      transferType === opt.value
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes — private to this transaction; shown only in this panel,
              never in the transaction list/table views. */}
          <div className="px-5 py-3.5">
            <span className="text-sm text-foreground mb-2 block">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note — only visible here"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {error && <p className="px-5 py-2 text-sm text-red-500">{error}</p>}

        {/* Save bar */}
        <div className="px-5 py-4 flex gap-2 sticky bottom-0 bg-card border-t border-border">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2.5 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
