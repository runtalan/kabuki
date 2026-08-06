'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home as HomeIcon, Pencil, Plus, Trash2, X } from 'lucide-react';
import { OWNERS, OwnerBadge, type OwnerKey } from '@/components/owner-badge';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { useIsDemo } from '@/hooks/use-is-demo';
import { formatCurrency } from '@/lib/format';
import type { PropertyWithComputed } from '@/lib/properties';

const OWNER_OPTIONS = Object.entries(OWNERS) as [OwnerKey, (typeof OWNERS)[OwnerKey]][];

interface FormState {
  name: string;
  address: string;
  owner: OwnerKey;
  estimatedValue: string;
  originalLoanAmount: string;
  interestRate: string;
  loanTermYears: string;
  loanStartDate: string;
}

function emptyForm(): FormState {
  return {
    name: '',
    address: '',
    owner: 'joint',
    estimatedValue: '',
    originalLoanAmount: '',
    interestRate: '',
    loanTermYears: '',
    loanStartDate: '',
  };
}

function formFor(property: PropertyWithComputed): FormState {
  return {
    name: property.name,
    address: property.address || '',
    owner: (property.owner as OwnerKey) || 'joint',
    estimatedValue: String(property.estimatedValue),
    originalLoanAmount: String(property.originalLoanAmount),
    interestRate: String(property.interestRate),
    loanTermYears: String(property.loanTermYears),
    loanStartDate: property.loanStartDate.slice(0, 10),
  };
}

interface PropertyFormModalProps {
  property: PropertyWithComputed | null; // null = creating a new property
  onClose: () => void;
  onSaved: () => void;
}

function PropertyFormModal({ property, onClose, onSaved }: PropertyFormModalProps) {
  const isEditing = property !== null;
  const [form, setForm] = useState<FormState>(() => (property ? formFor(property) : emptyForm()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEscapeKey(onClose);

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }

    const estimatedValue = parseFloat(form.estimatedValue);
    const originalLoanAmount = parseFloat(form.originalLoanAmount);
    const interestRate = parseFloat(form.interestRate);
    const loanTermYears = parseInt(form.loanTermYears, 10);

    if (
      Number.isNaN(estimatedValue) ||
      Number.isNaN(originalLoanAmount) ||
      Number.isNaN(interestRate) ||
      Number.isNaN(loanTermYears) ||
      !form.loanStartDate
    ) {
      setError('Please fill in all loan fields with valid numbers');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (isEditing) {
        // Only send fields that actually changed from the property's current
        // values — updateProperty() inserts a new propertyValueHistory row
        // whenever estimatedValue is present in the PATCH body, even if it's
        // numerically unchanged, so a "send everything every time" payload
        // would spam bogus history entries on every unrelated edit.
        const original = formFor(property);
        const payload: Record<string, string | number> = {};

        if (form.name !== original.name) payload.name = form.name.trim();
        if (form.address !== original.address) payload.address = form.address.trim();
        if (form.owner !== original.owner) payload.owner = form.owner;
        if (form.estimatedValue !== original.estimatedValue) payload.estimatedValue = estimatedValue;
        if (form.originalLoanAmount !== original.originalLoanAmount) payload.originalLoanAmount = originalLoanAmount;
        if (form.interestRate !== original.interestRate) payload.interestRate = interestRate;
        if (form.loanTermYears !== original.loanTermYears) payload.loanTermYears = loanTermYears;
        if (form.loanStartDate !== original.loanStartDate) payload.loanStartDate = form.loanStartDate;

        if (Object.keys(payload).length > 0) {
          const res = await fetch(`/api/properties/${property.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || 'Failed to save property');
          }
        }
      } else {
        // New property: send every field — createProperty() always inserts
        // one initial history row, which is correct/expected here.
        const res = await fetch('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            address: form.address.trim() || undefined,
            owner: form.owner,
            estimatedValue,
            originalLoanAmount,
            interestRate,
            loanTermYears,
            loanStartDate: form.loanStartDate,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to create property');
        }
      }

      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save property');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            {isEditing ? 'Edit Property' : 'Add Property'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="e.g. Lakeview Rental"
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => update({ address: e.target.value })}
              placeholder="123 Main St"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Owner</label>
            <select
              value={form.owner}
              onChange={(e) => update({ owner: e.target.value as OwnerKey })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
            >
              {OWNER_OPTIONS.map(([value, info]) => (
                <option key={value} value={value}>
                  {info.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Estimated Market Value
              </label>
              <input
                type="number"
                step="0.01"
                value={form.estimatedValue}
                onChange={(e) => update({ estimatedValue: e.target.value })}
                placeholder="$"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Original Loan Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={form.originalLoanAmount}
                onChange={(e) => update({ originalLoanAmount: e.target.value })}
                placeholder="$"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Interest Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.interestRate}
                onChange={(e) => update({ interestRate: e.target.value })}
                placeholder="%"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Loan Term (years)
              </label>
              <input
                type="number"
                value={form.loanTermYears}
                onChange={(e) => update({ loanTermYears: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Date</label>
              <input
                type="date"
                value={form.loanStartDate}
                onChange={(e) => update({ loanStartDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Property'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ManagePropertiesView({ properties }: { properties: PropertyWithComputed[] }) {
  const router = useRouter();
  const isDemo = useIsDemo();
  const [modalProperty, setModalProperty] = useState<PropertyWithComputed | null | undefined>(undefined); // undefined = closed
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const closeModal = () => setModalProperty(undefined);

  const handleSaved = () => {
    closeModal();
    router.refresh();
  };

  // Matches the delete-confirm pattern used by src/app/accounts/page.tsx's
  // handleDeleteManualAccount: a native confirm() dialog, then DELETE + refresh.
  const handleDelete = async (property: PropertyWithComputed) => {
    if (!confirm(`Delete "${property.name}"? Its value history will be removed too.`)) return;
    setDeletingId(property.id);
    try {
      const res = await fetch(`/api/properties/${property.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        alert('Error: ' + (body.error || 'Failed to delete property'));
      }
    } catch (e) {
      alert('Error: ' + (e instanceof Error ? e.message : 'Failed to delete property'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setModalProperty(null)}
          disabled={isDemo}
          title={isDemo ? 'View-only in demo mode' : undefined}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Add Property
        </button>
      </div>

      {properties.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <HomeIcon className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-40" />
          <h2 className="text-base font-semibold text-foreground mb-1">No properties yet</h2>
          <p className="text-sm text-muted-foreground">
            Add a property above to start tracking its value, loan balance, and equity.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg divide-y divide-border">
          {properties.map((property) => (
            <div key={property.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground truncate">{property.name}</p>
                  <OwnerBadge owner={property.owner} />
                </div>
                {property.address && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{property.address}</p>
                )}
              </div>

              <p className="text-sm font-semibold text-foreground flex-shrink-0 w-28 text-right">
                {formatCurrency(property.estimatedValue)}
              </p>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setModalProperty(property)}
                  disabled={isDemo}
                  title={isDemo ? 'View-only in demo mode' : 'Edit property'}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(property)}
                  disabled={isDemo || deletingId === property.id}
                  title={isDemo ? 'View-only in demo mode' : 'Delete property'}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalProperty !== undefined && (
        <PropertyFormModal property={modalProperty} onClose={closeModal} onSaved={handleSaved} />
      )}
    </div>
  );
}
