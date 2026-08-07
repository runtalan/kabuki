'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Trash2, ToggleLeft, X, Loader2, Pencil } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { AppLayout } from '@/components/app-layout';
import { CategoryIcon } from '@/components/category-icon';
import { FetchErrorBanner } from '@/components/fetch-error-banner';
import { useIsDemo } from '@/hooks/use-is-demo';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { DraggableRuleCard } from '@/components/rules/draggable-rule-card';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Rule {
  id: string;
  merchantName: string;
  matchType: 'exact' | 'contains' | 'startsWith';
  categoryId: string;
  priority: number;
  enabled: boolean;
  category?: Category;
}

interface PreviewTransaction {
  id: string;
  name: string;
  merchant: string | null;
  amount: string;
  type: 'debit' | 'credit';
  date: string;
  category: { name: string; color: string; icon: string } | null;
}

export default function RulesPage() {
  return (
    <Suspense fallback={null}>
      <RulesPageInner />
    </Suspense>
  );
}

function RulesPageInner() {
  const isDemo = useIsDemo();
  const searchParams = useSearchParams();
  const prefillMerchant = searchParams.get('merchant');
  const [rules, setRules] = useState<Rule[]>([]);
  const [orderedRules, setOrderedRules] = useState<Rule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showForm, setShowForm] = useState(!!prefillMerchant);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    merchantName: prefillMerchant || '',
    matchType: 'contains' as 'exact' | 'contains' | 'startsWith',
    categoryId: '',
    priority: 0,
    retroactive: false,
  });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<{ count: number; transactions: PreviewTransaction[] } | null>(
    null
  );
  const [creating, setCreating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setOrderedRules(rules);
  }, [rules]);

  useEscapeKey(() => setPreview(null), !!preview);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = orderedRules.findIndex((r) => r.id === active.id);
    const newIndex = orderedRules.findIndex((r) => r.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const newOrder = arrayMove(orderedRules, oldIndex, newIndex);
    setOrderedRules(newOrder);

    try {
      await fetch('/api/rules/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleIds: newOrder.map((r) => r.id) }),
      });
    } catch (error) {
      console.error('Failed to save rule order:', error);
      setOrderedRules(rules);
    }
  };

  const fetchData = async () => {
    try {
      const [rulesRes, categoriesRes] = await Promise.all([
        fetch('/api/rules'),
        fetch('/api/categories'),
      ]);

      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setRules(rulesData.rules || []);
      } else {
        setLoadError(true);
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.categories || []);
      } else {
        setLoadError(true);
      }

      if (rulesRes.ok && categoriesRes.ok) setLoadError(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({ merchantName: '', matchType: 'contains', categoryId: '', priority: 0, retroactive: false });
    setPreview(null);
    setShowForm(true);
  };

  const openEdit = (rule: Rule, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(rule.id);
    setFormData({
      merchantName: rule.merchantName,
      matchType: rule.matchType,
      categoryId: rule.categoryId,
      priority: rule.priority,
      retroactive: false,
    });
    setPreview(null);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ merchantName: '', matchType: 'contains', categoryId: '', priority: 0, retroactive: false });
    setEditingId(null);
    setShowForm(false);
    setPreview(null);
  };

  const saveRule = async (retroactive: boolean = false) => {
    setCreating(true);
    try {
      const isEdit = !!editingId;
      const method = isEdit ? 'PUT' : 'POST';
      const url = isEdit ? `/api/rules/${editingId}` : '/api/rules';
      const body = isEdit ? formData : { ...formData, retroactive };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        await fetchData();
        resetForm();
        if (isEdit) {
          alert('✅ Rule updated!');
        } else {
          alert(
            retroactive
              ? `✅ Rule created and applied to ${data.retagged} transaction${data.retagged === 1 ? '' : 's'}!`
              : '✅ Rule created!'
          );
        }
      } else {
        alert(`Failed to ${isEdit ? 'update' : 'create'} rule`);
      }
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Failed to save'));
    } finally {
      setCreating(false);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.merchantName.trim() || !formData.categoryId) {
      alert('Please fill in all fields');
      return;
    }

    const isEdit = !!editingId;
    if (isEdit) {
      await saveRule(false);
      return;
    }

    if (!formData.retroactive) {
      await saveRule(false);
      return;
    }

    // Retroactive was requested — preview matching transactions before
    // touching anything. The rule itself isn't created until confirmed.
    setPreviewLoading(true);
    try {
      const response = await fetch('/api/rules/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        const data = await response.json();
        setPreview(data);
      } else {
        alert('Failed to preview matching transactions');
      }
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Failed to preview'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Delete this rule?')) {
      return;
    }

    try {
      const response = await fetch(`/api/rules/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchData();
        alert('✅ Rule deleted');
      } else {
        alert('Failed to delete rule');
      }
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Failed to delete'));
    }
  };

  const handleToggleRule = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });

      if (response.ok) {
        await fetchData();
      } else {
        alert('Failed to toggle rule');
      }
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Failed to toggle'));
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-4 md:p-8">
          <p className="text-muted-foreground">Loading rules...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        {loadError && (
          <FetchErrorBanner
            message="Couldn't load your rules. Check your connection and try again."
            onRetry={() => {
              setLoading(true);
              fetchData();
            }}
          />
        )}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Auto-Tagging Rules</h1>
            <p className="text-muted-foreground">Automatically tag transactions based on merchant patterns</p>
          </div>
          <button
            onClick={openCreate}
            disabled={isDemo}
            title={isDemo ? 'View-only in demo mode' : undefined}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            New Rule
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-card border border-border rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {editingId ? 'Edit Rule' : 'New Rule'}
            </h2>
            <form onSubmit={handleSaveRule} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Merchant name (e.g., 'Starbucks', 'Amazon')"
                  value={formData.merchantName}
                  onChange={(e) => setFormData({ ...formData, merchantName: e.target.value })}
                  className="px-4 py-2 rounded border border-border bg-background text-foreground"
                />

                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="px-4 py-2 rounded border border-border bg-background text-foreground"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Match Type</label>
                  <select
                    value={formData.matchType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        matchType: e.target.value as 'exact' | 'contains' | 'startsWith',
                      })
                    }
                    className="w-full px-4 py-2 rounded border border-border bg-background text-foreground"
                  >
                    <option value="contains">Contains (partial match)</option>
                    <option value="exact">Exact Match</option>
                    <option value="startsWith">Starts With</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.matchType === 'contains' &&
                      'Matches if merchant name contains the search term'}
                    {formData.matchType === 'exact' &&
                      'Matches if merchant name exactly equals the search term'}
                    {formData.matchType === 'startsWith' &&
                      'Matches if merchant name starts with the search term'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Priority</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 rounded border border-border bg-background text-foreground"
                    placeholder="Higher priority rules run first"
                  />
                </div>
              </div>

              {!editingId && (
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.retroactive}
                    onChange={(e) => setFormData({ ...formData, retroactive: e.target.checked })}
                    className="w-4 h-4 rounded border-border"
                  />
                  Apply this rule retroactively to existing transactions
                </label>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={previewLoading || creating}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {(previewLoading || creating) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId
                    ? 'Save Changes'
                    : formData.retroactive
                      ? 'Preview & Create Rule'
                      : 'Create Rule'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Retroactive apply preview modal */}
        {preview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPreview(null)} />
            <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Apply this rule to {preview.count} other transaction{preview.count === 1 ? '' : 's'}?
                </h2>
                <button
                  onClick={() => setPreview(null)}
                  title="Close"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {preview.count === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No existing transactions match this rule.
                </p>
              ) : (
                <div className="max-h-96 overflow-y-auto -mx-2 space-y-1">
                  {preview.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-3 px-2 py-2 rounded-lg"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{tx.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                          {tx.category && ` · currently ${tx.category.name}`}
                        </p>
                      </div>
                      <p
                        className={`text-sm font-semibold flex-shrink-0 ${
                          tx.type === 'credit' ? 'text-emerald-500' : 'text-foreground'
                        }`}
                      >
                        {tx.type === 'credit' ? '+' : '-'}$
                        {Math.abs(parseFloat(tx.amount)).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => saveRule(true)}
                  disabled={creating}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {preview.count === 0 ? 'Create Rule' : `Confirm & Apply to ${preview.count}`}
                </button>
                <button
                  onClick={() => setPreview(null)}
                  disabled={creating}
                  className="px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rules List */}
        {orderedRules.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground mb-2">No rules created yet</p>
            <p className="text-sm text-muted-foreground">
              Create a rule to automatically tag transactions based on merchant names
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={orderedRules.map((r) => r.id)}>
              <div className="space-y-3">
                {orderedRules.map((rule) => (
                  <DraggableRuleCard
                    key={rule.id}
                    id={rule.id}
                    merchantName={rule.merchantName}
                    matchType={rule.matchType}
                    category={rule.category}
                    priority={rule.priority}
                    enabled={rule.enabled}
                    totalRules={orderedRules.length}
                    onToggle={handleToggleRule}
                    onEdit={(e) => openEdit(rule, e)}
                    onDelete={handleDeleteRule}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </AppLayout>
  );
}
