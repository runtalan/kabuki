'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X, Tags as TagsIcon, Receipt, Loader, List, Table2 } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { useEscapeKey } from '@/hooks/use-escape-key';

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
}

const COLOR_OPTIONS = [
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
  '#d946ef', '#ec4899', '#f43f5e', '#64748b',
];

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'table'>('table');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', color: '#6366f1' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Transactions-for-tag modal
  const [viewingTag, setViewingTag] = useState<Tag | null>(null);
  const [tagTxs, setTagTxs] = useState<Transaction[]>([]);
  const [txsLoading, setTxsLoading] = useState(false);

  useEscapeKey(() => {
    if (formOpen) return setFormOpen(false);
    if (viewingTag) return setViewingTag(null);
  }, formOpen || !!viewingTag);

  useEffect(() => {
    fetchTags();
    const savedView = localStorage.getItem('tags-view-mode');
    if (savedView === 'list' || savedView === 'table') {
      setViewMode(savedView);
    }
  }, []);

  const changeViewMode = (mode: 'list' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('tags-view-mode', mode);
  };

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/tags');
      if (res.ok) {
        const data = await res.json();
        setTags(data.tags || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', color: '#6366f1' });
    setError('');
    setFormOpen(true);
  };

  const openEdit = (tag: Tag, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(tag.id);
    setForm({ name: tag.name, color: tag.color });
    setError('');
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Please enter a tag name');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(editingId ? `/api/tags/${editingId}` : '/api/tags', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        await fetchTags();
        setFormOpen(false);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save tag');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: Tag, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${tag.name}"? It will be removed from all transactions.`)) return;
    const res = await fetch(`/api/tags/${tag.id}`, { method: 'DELETE' });
    if (res.ok) {
      setTags((prev) => prev.filter((t) => t.id !== tag.id));
    }
  };

  const openTransactions = async (tag: Tag) => {
    setViewingTag(tag);
    setTxsLoading(true);
    try {
      const res = await fetch(`/api/transactions?tag=${tag.id}`);
      if (res.ok) {
        const data = await res.json();
        setTagTxs(data.transactions || []);
      }
    } finally {
      setTxsLoading(false);
    }
  };

  const tagTotal = tagTxs.reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-4 md:p-8">
          <p className="text-muted-foreground">Loading tags...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Tags</h1>
            <p className="text-muted-foreground">
              Freeform labels for tracking things across categories — click a tag to see its transactions
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
              New Tag
            </button>
          </div>
        </div>

        {tags.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <TagsIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground mb-1">No tags yet</p>
            <p className="text-sm text-muted-foreground">
              Try "Coachella" or "Wedding" — tag any transaction, regardless of its category
            </p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Tag
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Color
                  </th>
                  <th className="px-6 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {tags.map((tag) => (
                  <tr
                    key={tag.id}
                    onClick={() => openTransactions(tag)}
                    className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-3">
                      <span
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                        style={{ backgroundColor: tag.color + '1a', color: tag.color }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                        {tag.name}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full border border-border"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-xs text-muted-foreground font-mono">{tag.color}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span
                          onClick={(e) => openEdit(tag, e)}
                          className="p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        >
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </span>
                        <span
                          onClick={(e) => handleDelete(tag, e)}
                          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer transition-colors"
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
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => openTransactions(tag)}
                className="flex items-center justify-between px-4 py-3 rounded-lg bg-card border border-border hover:bg-muted/40 hover:border-primary/30 transition-all group text-left"
              >
                <span
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{ backgroundColor: tag.color + '1a', color: tag.color }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span
                    onClick={(e) => openEdit(tag, e)}
                    className="p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </span>
                  <span
                    onClick={(e) => handleDelete(tag, e)}
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer transition-colors"
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setFormOpen(false)} />
          <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                {editingId ? 'Edit Tag' : 'New Tag'}
              </h2>
              <button
                onClick={() => setFormOpen(false)}
                title="Close"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <input
                type="text"
                placeholder="Tag name (e.g. Coachella)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              />
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Color</p>
                <div className="flex gap-1.5 flex-wrap">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, color })}
                      className={`w-8 h-8 rounded-lg border-2 transition-transform ${
                        form.color === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Tag'}
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2.5 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tag Transactions Modal */}
      {viewingTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewingTag(null)} />
          <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div
              className="px-6 py-5 flex items-center justify-between"
              style={{ background: `linear-gradient(135deg, ${viewingTag.color}22, ${viewingTag.color}08)` }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: viewingTag.color }} />
                  <h2 className="text-lg font-semibold text-foreground">{viewingTag.name}</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  {txsLoading
                    ? 'Loading...'
                    : `${tagTxs.length} transaction${tagTxs.length === 1 ? '' : 's'} · $${tagTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} total`}
                </p>
              </div>
              <button
                onClick={() => setViewingTag(null)}
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
              ) : tagTxs.length > 0 ? (
                tagTxs.map((tx) => (
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
                        tx.type === 'credit' ? 'text-emerald-500' : 'text-foreground'
                      }`}
                    >
                      {tx.type === 'credit' ? '+' : ''}$
                      {Math.abs(parseFloat(tx.amount)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                  <Receipt className="w-8 h-8 opacity-40" />
                  <p className="text-sm">No transactions tagged yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
