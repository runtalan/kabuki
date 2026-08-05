'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Plus, Loader, Search, Check } from 'lucide-react';
import { CategoryIcon } from './category-icon';
import { OWNERS } from './owner-badge';

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
  amount: string;
  type: 'debit' | 'credit';
  date: string;
  categoryId?: string | null;
  ownerOverride?: string | null;
  account?: { owner?: string | null } | null;
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
  const [name, setName] = useState(transaction.name);
  const [type, setType] = useState<'debit' | 'credit'>(transaction.type);
  const [amount, setAmount] = useState(Math.abs(parseFloat(transaction.amount)).toString());
  const [date, setDate] = useState(new Date(transaction.date).toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState(transaction.categoryId || '');
  const [ownerOverride, setOwnerOverride] = useState(transaction.ownerOverride || '');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    (transaction.tags || []).map((t) => t.id)
  );

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [categorySearch, setCategorySearch] = useState('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  const tagBlurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoryBlurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/tags')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setAllTags(data.tags || []));
  }, []);

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

  const handleSave = async () => {
    if (!name.trim() || !amount || Number.isNaN(parseFloat(amount))) {
      setError('Please enter a valid merchant and amount');
      return;
    }
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
        }),
      });
      if (res.ok) {
        onSaved();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save transaction');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Edit Transaction</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Merchant / Description</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Amount</label>
              <div className="flex items-center gap-2">
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
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Category</label>
            {selectedCategory ? (
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-2"
                style={{ backgroundColor: selectedCategory.color + '1a', color: selectedCategory.color }}
              >
                <CategoryIcon icon={selectedCategory.icon} className="w-3.5 h-3.5" />
                {selectedCategory.name}
                <button
                  type="button"
                  onClick={() => setCategoryId('')}
                  className="hover:opacity-70 transition-opacity"
                  title="Clear category"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mb-2">Untagged</p>
            )}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  onFocus={() => {
                    if (categoryBlurTimeout.current) clearTimeout(categoryBlurTimeout.current);
                    setCategoryDropdownOpen(true);
                  }}
                  onBlur={() => {
                    categoryBlurTimeout.current = setTimeout(() => setCategoryDropdownOpen(false), 150);
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                />
              </div>
              {categoryDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-10 max-h-56 overflow-y-auto bg-popover border border-border rounded-lg shadow-xl">
                  {filteredCategoryResults.length > 0 ? (
                    filteredCategoryResults.map((cat) => (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => {
                          setCategoryId(cat.id);
                          setCategorySearch('');
                          setCategoryDropdownOpen(false);
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
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Owner{' '}
              <span className="text-xs text-muted-foreground font-normal">
                (defaults to account: {OWNERS[(transaction.account?.owner as keyof typeof OWNERS) || 'joint'].label})
              </span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOwnerOverride('')}
                className={`flex-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  ownerOverride === ''
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                Use account default
              </button>
              {(Object.entries(OWNERS) as [string, (typeof OWNERS)[keyof typeof OWNERS]][]).map(
                ([value, info]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setOwnerOverride(value)}
                    className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      ownerOverride === value
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <span>{info.emoji}</span>
                    {info.label}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Tags</label>

            {/* Selected tags — click X to remove */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: tag.color, color: '#fff' }}
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => removeTag(tag.id)}
                      className="hover:opacity-70 transition-opacity"
                      title="Remove tag"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Quick-add: only a handful shown so this doesn't sprawl with many tags */}
            {quickAddTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {quickAddTags.map((tag) => (
                  <button
                    type="button"
                    key={tag.id}
                    onClick={() => addTag(tag.id)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-all hover:opacity-80"
                    style={{ backgroundColor: tag.color + '15', borderColor: tag.color + '40', color: tag.color }}
                  >
                    <Plus className="w-3 h-3" />
                    {tag.name}
                  </button>
                ))}
              </div>
            )}

            {/* Search for anything beyond the quick-add shortlist */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search or create a tag..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  onFocus={() => {
                    if (tagBlurTimeout.current) clearTimeout(tagBlurTimeout.current);
                    setTagDropdownOpen(true);
                  }}
                  onBlur={() => {
                    tagBlurTimeout.current = setTimeout(() => setTagDropdownOpen(false), 150);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filteredTagResults.length === 0 && tagSearch.trim()) {
                      e.preventDefault();
                      handleCreateTag();
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                />
              </div>
              {tagDropdownOpen && tagSearch.trim() && (
                <div className="absolute left-0 right-0 top-full mt-1 z-10 max-h-56 overflow-y-auto bg-popover border border-border rounded-lg shadow-xl">
                  {filteredTagResults.map((tag) => (
                    <button
                      type="button"
                      key={tag.id}
                      onClick={() => addTag(tag.id)}
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
                      {creatingTag ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      Create "{tagSearch.trim()}"
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
