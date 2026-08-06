'use client';

import { useState } from 'react';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { CategoryIcon } from '@/components/category-icon';
import { LUCIDE_ICONS } from '@/lib/icons';
import { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from '@/lib/category-colors';
import { useEscapeKey } from '@/hooks/use-escape-key';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export function CategoryFilterMenu({
  categories,
  value,
  onChange,
  onCreated,
}: {
  categories: Category[];
  value: string; // 'all' | 'uncategorized' | category id
  onChange: (id: string) => void;
  onCreated: (category: Category) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(DEFAULT_CATEGORY_COLOR);
  const [newIcon, setNewIcon] = useState('folder');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    setOpen(false);
    setCreating(false);
    setShowIconPicker(false);
    setSearch('');
  };

  useEscapeKey(() => {
    if (showIconPicker) return setShowIconPicker(false);
    if (creating) return setCreating(false);
    close();
  }, open);

  const selected = categories.find((c) => c.id === value);
  const filtered = search.trim()
    ? categories.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    : categories;

  const startCreate = () => {
    setCreating(true);
    setNewName(search.trim());
    setNewColor(DEFAULT_CATEGORY_COLOR);
    setNewIcon('folder');
    setError('');
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor, icon: newIcon }),
      });
      const data = await res.json();
      if (res.ok) {
        onCreated(data);
        onChange(data.id);
        close();
      } else {
        setError(data.error || 'Failed to create category');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 pl-2.5 pr-2 py-2 rounded-lg border text-sm transition-colors ${
          value !== 'all'
            ? 'border-primary/40 bg-primary/5 text-foreground'
            : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        {selected ? (
          <>
            <CategoryIcon icon={selected.icon} color={selected.color} className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="max-w-28 truncate">{selected.name}</span>
          </>
        ) : value === 'uncategorized' ? (
          <span>Uncategorized</span>
        ) : (
          <span>All Categories</span>
        )}
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className="absolute left-0 top-full mt-1.5 w-72 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            {!creating ? (
              <>
                <div className="relative p-2 border-b border-border">
                  <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    autoFocus
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search categories..."
                    className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-muted/50 text-foreground text-sm focus:outline-none"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  <button
                    type="button"
                    onClick={() => {
                      onChange('all');
                      close();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left"
                  >
                    All Categories
                    {value === 'all' && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChange('uncategorized');
                      close();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left"
                  >
                    Uncategorized
                    {value === 'uncategorized' && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                  {filtered.length > 0 && <div className="my-1 border-t border-border" />}
                  {filtered.map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => {
                        onChange(cat.id);
                        close();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left"
                    >
                      <span
                        className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: cat.color + '22' }}
                      >
                        <CategoryIcon icon={cat.icon} color={cat.color} className="w-3.5 h-3.5" />
                      </span>
                      <span className="flex-1 truncate">{cat.name}</span>
                      {value === cat.id && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="px-3 py-3 text-sm text-muted-foreground">No matching categories</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={startCreate}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors border-t border-border"
                >
                  <Plus className="w-4 h-4" />
                  New category
                </button>
              </>
            ) : (
              <div className="p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowIconPicker((v) => !v)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${newColor}, ${newColor}cc)` }}
                      title="Choose icon"
                    >
                      <CategoryIcon icon={newIcon} className="w-4 h-4 text-white" />
                    </button>
                    {showIconPicker && (
                      <div className="absolute top-full mt-1.5 left-0 w-56 bg-card border border-border rounded-xl p-2 max-h-44 overflow-y-auto z-10 shadow-xl">
                        <div className="grid grid-cols-6 gap-1">
                          {LUCIDE_ICONS.map((icon) => (
                            <button
                              key={icon}
                              type="button"
                              onClick={() => {
                                setNewIcon(icon);
                                setShowIconPicker(false);
                              }}
                              className={`p-1.5 rounded-lg border flex items-center justify-center hover:bg-muted transition-colors ${
                                newIcon === icon ? 'border-primary bg-primary/10' : 'border-transparent'
                              }`}
                            >
                              <CategoryIcon icon={icon} className="w-3.5 h-3.5" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    autoFocus
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="Category name"
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="grid grid-cols-8 gap-1.5">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewColor(color)}
                      title={color}
                      className={`w-6 h-6 rounded-md transition-transform hover:scale-105 ${
                        newColor === color ? 'scale-110 ring-2 ring-offset-1 ring-offset-card ring-foreground' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={saving || !newName.trim()}
                    className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreating(false)}
                    className="px-3 py-1.5 bg-muted text-foreground text-xs rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
