'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, ToggleLeft } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { CategoryIcon } from '@/components/category-icon';
import { FetchErrorBanner } from '@/components/fetch-error-banner';
import { useIsDemo } from '@/hooks/use-is-demo';

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

export default function RulesPage() {
  const isDemo = useIsDemo();
  const [rules, setRules] = useState<Rule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    merchantName: '',
    matchType: 'contains' as 'exact' | 'contains' | 'startsWith',
    categoryId: '',
    priority: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.merchantName.trim() || !formData.categoryId) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchData();
        setFormData({
          merchantName: '',
          matchType: 'contains',
          categoryId: '',
          priority: 0,
        });
        setShowForm(false);
        alert('✅ Rule created!');
      } else {
        alert('Failed to create rule');
      }
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Failed to create'));
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
            onClick={() => setShowForm(!showForm)}
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
            <form onSubmit={handleCreateRule} className="space-y-4">
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

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  Create Rule
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Rules List */}
        <div className="space-y-3">
          {rules.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground mb-2">No rules created yet</p>
              <p className="text-sm text-muted-foreground">
                Create a rule to automatically tag transactions based on merchant names
              </p>
            </div>
          ) : (
            rules
              .sort((a, b) => b.priority - a.priority)
              .map((rule) => (
                <div
                  key={rule.id}
                  className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <button
                      onClick={() => handleToggleRule(rule.id, rule.enabled)}
                      className={`p-2 rounded transition-colors ${
                        rule.enabled
                          ? 'text-primary bg-primary/10'
                          : 'text-muted-foreground bg-muted'
                      }`}
                    >
                      <ToggleLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {rule.matchType === 'contains' && `Contains "${rule.merchantName}"`}
                        {rule.matchType === 'exact' && `Exact: "${rule.merchantName}"`}
                        {rule.matchType === 'startsWith' && `Starts with "${rule.merchantName}"`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: rule.category?.color + '20',
                            color: rule.category?.color || '#6b7280',
                          }}
                        >
                          <CategoryIcon icon={rule.category?.icon} className="w-3.5 h-3.5" />
                          {rule.category?.name || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Priority: {rule.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
