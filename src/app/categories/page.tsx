'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X, Receipt, Loader, List, Table2 } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { LUCIDE_ICONS } from '@/lib/icons';
import { CategoryIcon } from '@/components/category-icon';

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

const COLOR_OPTIONS = [
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
  '#d946ef', '#ec4899', '#f43f5e', '#64748b', '#6b7280',
];

const EMPTY_FORM = { name: '', color: '#3b82f6', icon: 'folder' };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'table'>('table');

  // Create / edit form state (editingId === null means creating)
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Transactions modal state
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null);
  const [categoryTxs, setCategoryTxs] = useState<Transaction[]>([]);
  const [txsLoading, setTxsLoading] = useState(false);

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

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      if (response.ok) {
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (cat: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(cat.id);
    setForm({ name: cat.name, color: cat.color, icon: cat.icon });
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
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 shadow-sm hover:shadow-md transition-all"
            >
              <Plus className="w-5 h-5" />
              New Category
            </button>
          </div>
        </div>

        {viewMode === 'table' ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Color
                  </th>
                  <th className="px-6 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
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
            {categories.map((cat) => (
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
                <div className="flex gap-1.5 flex-wrap">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, color })}
                      className={`w-8 h-8 rounded-lg border-2 transition-transform ${
                        form.color === color
                          ? 'border-foreground scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
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
