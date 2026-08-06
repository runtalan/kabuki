'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X, Receipt, Loader, List, Table2, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { LUCIDE_ICONS } from '@/lib/icons';
import { CategoryIcon } from '@/components/category-icon';
import { useIsDemo } from '@/hooks/use-is-demo';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { FetchErrorBanner } from '@/components/fetch-error-banner';
import { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR, getColorName, isValidHexColor } from '@/lib/category-colors';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  isCustom: boolean;
}

interface Transaction {
  id: string;
  name: string;
  merchant?: string | null;
  amount: string;
  type: 'debit' | 'credit';
  date: string;
  categoryId?: string | null;
}

const EMPTY_FORM = { name: '', color: DEFAULT_CATEGORY_COLOR, icon: 'folder' };

export default function CategoriesPage() {
  const isDemo = useIsDemo();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'table'>('table');
  const [sortBy, setSortBy] = useState<'name' | 'type'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Create / edit form state (editingId === null means creating)
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [hexInput, setHexInput] = useState(EMPTY_FORM.color);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Transactions modal state
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null);
  const [categoryTxs, setCategoryTxs] = useState<Transaction[]>([]);
  const [txsLoading, setTxsLoading] = useState(false);

  // Escape unwinds one layer at a time: icon picker, then the form/detail modal.
  useEscapeKey(() => {
    if (showIconPicker) return setShowIconPicker(false);
    if (formOpen) return setFormOpen(false);
    if (viewingCategory) return setViewingCategory(null);
  }, showIconPicker || formOpen || !!viewingCategory);

  useEffect(() => {
    fetchCategories();
    const savedView = localStorage.getItem('categories-view-mode');
    if (savedView === 'list' || savedView === 'table') {
      setViewMode(savedView);
    }
  }, []);

  const changeViewMode = (mode: 'list' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('categories-view-mode', mode);
  };

  const toggleSort = (col: 'name' | 'type') => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const sortedCategories = [...categories].sort((a, b) => {
    let cmp =
      sortBy === 'name'
        ? a.name.localeCompare(b.name)
        : Number(a.isCustom) - Number(b.isCustom) || a.name.localeCompare(b.name);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      if (response.ok) {
        setCategories(data.categories || []);
        setLoadError(false);
      } else {
        setLoadError(true);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setHexInput(EMPTY_FORM.color);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (cat: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(cat.id);
    setForm({ name: cat.name, color: cat.color, icon: cat.icon });
    setHexInput(cat.color);
    setFormError('');
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError('Please enter a category name');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const response = await fetch(
        editingId ? `/api/categories/${editingId}` : '/api/categories',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      );

      if (response.ok) {
        await fetchCategories();
        setFormOpen(false);
      } else {
        const data = await response.json();
        setFormError(data.error || 'Failed to save category');
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete “${cat.name}”? Transactions in this category will become untagged.`)) {
      return;
    }
    try {
      const response = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' });
      if (response.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete category');
      }
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Failed to delete'));
    }
  };

  const openTransactions = async (cat: Category) => {
    setViewingCategory(cat);
    setTxsLoading(true);
    try {
      const response = await fetch('/api/transactions');
      if (response.ok) {
        const data = await response.json();
        const txs: Transaction[] = data.transactions || [];
        setCategoryTxs(txs.filter((tx) => tx.categoryId === cat.id).slice(0, 25));
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setTxsLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-4 md:p-8">
          <p className="text-muted-foreground">Loading categories...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        {loadError && (
          <FetchErrorBanner
            message="Couldn't load your categories. Check your connection and try again."
            onRetry={() => {
              setLoading(true);
              fetchCategories();
            }}
          />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Categories</h1>
            <p className="text-muted-foreground">
              Organize spending — click a category to see its transactions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex p-0.5 rounded-lg bg-muted border border-border">
              <button
                onClick={() => changeViewMode('table')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Table view"
              >
                <Table2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => changeViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={openCreate}
              disabled={isDemo}
              title={isDemo ? 'View-only in demo mode' : undefined}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm"
            >
              <Plus className="w-5 h-5" />
              New Category
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground">Sort by</span>
          {(['name', 'type'] as const).map((col) => (
            <button
              key={col}
              onClick={() => toggleSort(col)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                sortBy === col
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {col === 'name' ? 'Category' : 'Type'}
              {sortBy === col &&
                (sortDir === 'asc' ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                ))}
            </button>
          ))}
        </div>

        {viewMode === 'table' ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <button
                      onClick={() => toggleSort('name')}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Category
                      {sortBy === 'name' &&
                        (sortDir === 'asc' ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        ))}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <button
                      onClick={() => toggleSort('type')}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Type
                      {sortBy === 'type' &&
                        (sortDir === 'asc' ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        ))}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Color
                  </th>
                  <th className="px-6 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {sortedCategories.map((cat) => (
                  <tr
                    key={cat.id}
                    onClick={() => openTransactions(cat)}
                    className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${cat.color}, ${cat.color}cc)`,
                          }}
                        >
                          <CategoryIcon icon={cat.icon} className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-xs text-muted-foreground">
                        {cat.isCustom ? 'Custom' : 'Default'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full border border-border"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-xs text-muted-foreground font-mono">{cat.color}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span
                          onClick={(e) => openEdit(cat, e)}
                          className="p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                          title="Edit category"
                        >
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </span>
                        <span
                          onClick={(e) => handleDelete(cat, e)}
                          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer transition-colors"
                          title="Delete category"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => openTransactions(cat)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-card border border-border hover:bg-muted/40 hover:border-primary/30 transition-all group text-left"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${cat.color}, ${cat.color}cc)`,
                  }}
                >
                  <CategoryIcon icon={cat.icon} className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {cat.isCustom ? 'Custom' : 'Default'}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <span
                    onClick={(e) => openEdit(cat, e)}
                    className="p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    title="Edit category"
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </span>
                  <span
                    onClick={(e) => handleDelete(cat, e)}
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer transition-colors"
                    title="Delete category"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setFormOpen(false)}
          />
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                {editingId ? 'Edit Category' : 'New Category'}
              </h2>
              <button
                onClick={() => setFormOpen(false)}
                title="Close"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="flex gap-3">
                {/* Icon picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="w-12 h-12 rounded-xl flex items-center justify-center border border-border hover:border-primary/40 transition-colors"
                    style={{
                      background: `linear-gradient(135deg, ${form.color}, ${form.color}cc)`,
                    }}
                    title="Choose icon"
                  >
                    <CategoryIcon icon={form.icon} className="w-5 h-5 text-white" />
                  </button>
                  {showIconPicker && (
                    <div className="absolute top-full mt-2 left-0 w-72 bg-card border border-border rounded-xl p-3 max-h-56 overflow-y-auto z-10 shadow-xl">
                      <div className="grid grid-cols-6 gap-1.5">
                        {LUCIDE_ICONS.map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => {
                              setForm({ ...form, icon });
                              setShowIconPicker(false);
                            }}
                            className={`p-2 rounded-lg border flex items-center justify-center hover:bg-muted transition-colors ${
                              form.icon === icon ? 'border-primary bg-primary/10' : 'border-transparent'
                            }`}
                            title={icon}
                          >
                            <CategoryIcon icon={icon} className="w-4 h-4" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Category name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  autoFocus
                  className="flex-1 px-4 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-2">Color</p>
                <div className="grid grid-cols-5 gap-2 w-fit">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, color });
                        setHexInput(color);
                      }}
                      title={getColorName(color)}
                      className={`relative w-8 h-8 rounded-lg transition-transform hover:scale-105 ${
                        form.color.toLowerCase() === color ? 'scale-110 ring-2 ring-offset-2 ring-offset-card ring-foreground' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {form.color.toLowerCase() === color && (
                        <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Custom color — native picker + hex input, for anything the
                    curated swatches above don't cover (and to show a legacy
                    color that predates this palette). */}
                <div className="flex items-center gap-2 mt-3">
                  <label
                    className="relative w-8 h-8 rounded-lg border border-border flex-shrink-0 overflow-hidden cursor-pointer"
                    style={{ backgroundColor: isValidHexColor(hexInput) ? hexInput : form.color }}
                    title="Pick a custom color"
                  >
                    <input
                      type="color"
                      value={isValidHexColor(hexInput) ? hexInput : form.color}
                      onChange={(e) => {
                        setForm({ ...form, color: e.target.value });
                        setHexInput(e.target.value);
                      }}
                      className="absolute -top-2 -left-2 w-14 h-14 cursor-pointer"
                    />
                  </label>
                  <input
                    type="text"
                    value={hexInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setHexInput(value);
                      if (isValidHexColor(value)) {
                        setForm({ ...form, color: value });
                      }
                    }}
                    placeholder="#rrggbb"
                    spellCheck={false}
                    className={`flex-1 px-3 py-1.5 rounded-lg border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                      isValidHexColor(hexInput) ? 'border-border' : 'border-red-400'
                    }`}
                  />
                </div>
              </div>

              {formError && <p className="text-sm text-red-500">{formError}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Category'}
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2.5 bg-muted text-foreground rounded-xl hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Transactions Modal */}
      {viewingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setViewingCategory(null)}
          />
          <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Header with category gradient */}
            <div
              className="px-6 py-5 flex items-center justify-between"
              style={{
                background: `linear-gradient(135deg, ${viewingCategory.color}22, ${viewingCategory.color}08)`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${viewingCategory.color}, ${viewingCategory.color}cc)`,
                  }}
                >
                  <CategoryIcon icon={viewingCategory.icon} className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {viewingCategory.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">Recent transactions</p>
                </div>
              </div>
              <button
                onClick={() => setViewingCategory(null)}
                title="Close"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto px-3 py-2">
              {txsLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading transactions...</span>
                </div>
              ) : categoryTxs.length > 0 ? (
                categoryTxs.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{tx.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-semibold whitespace-nowrap ml-4 ${
                        tx.type === 'credit' ? 'text-green-600' : 'text-foreground'
                      }`}
                    >
                      {tx.type === 'credit' ? '+' : ''}$
                      {Math.abs(parseFloat(tx.amount)).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                  <Receipt className="w-8 h-8 opacity-40" />
                  <p className="text-sm">No transactions in this category yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
