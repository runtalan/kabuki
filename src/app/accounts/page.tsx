'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  Edit2,
  Wallet,
  CreditCard,
  PiggyBank,
  TrendingUp,
  Plus,
  X,
  Landmark,
  GraduationCap,
  Home as HomeIcon,
  LayoutGrid,
  List,
} from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { PlaidLinkButton } from '@/components/plaid-link-button';
import { OWNERS } from '@/components/owner-badge';
import { LIABILITY_TYPES, getTypeBadge } from '@/lib/account-types';

interface Account {
  id: string;
  name: string;
  displayName?: string;
  icon?: string;
  owner?: string;
  officialName?: string;
  type: string;
  subtype?: string;
  kind?: 'asset' | 'liability';
  liabilityType?: string | null;
  isManual?: boolean;
  currentBalance: string;
  lastSyncedAt?: string;
}

const OWNER_OPTIONS = (Object.entries(OWNERS) as [string, (typeof OWNERS)[keyof typeof OWNERS]][]).map(
  ([value, info]) => ({ value, label: info.label, emoji: info.emoji })
);

interface PlaidItem {
  id: string;
  institutionName?: string;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastError?: string;
  lastSyncedAt?: string;
  isManual?: boolean;
  addedByUsername?: string | null;
  accounts: Account[];
}

const ICON_OPTIONS = [
  { name: 'Wallet', icon: Wallet },
  { name: 'CreditCard', icon: CreditCard },
  { name: 'PiggyBank', icon: PiggyBank },
  { name: 'TrendingUp', icon: TrendingUp },
  { name: 'CheckCircle', icon: CheckCircle },
];

export default function AccountsPage() {
  const router = useRouter();
  const [items, setItems] = useState<PlaidItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ displayName: '', icon: '', owner: 'joint', currentBalance: '' });

  // Manual liability creation
  const [showAddLiability, setShowAddLiability] = useState(false);
  const [liabilityForm, setLiabilityForm] = useState({
    name: '',
    kind: 'liability' as 'asset' | 'liability',
    liabilityType: 'credit_card',
    currentBalance: '',
    owner: 'joint',
    icon: 'CreditCard',
  });
  const [savingLiability, setSavingLiability] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
  const [institutionNameDraft, setInstitutionNameDraft] = useState('');

  useEffect(() => {
    fetchAccounts();
    const savedView = localStorage.getItem('accounts-view-mode');
    if (savedView === 'grid' || savedView === 'list') {
      setViewMode(savedView);
    }
  }, []);

  const changeViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('accounts-view-mode', mode);
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      const data = await response.json();
      if (response.ok) {
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (itemId: string) => {
    setRefreshing(itemId);
    try {
      const response = await fetch('/api/accounts/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });

      if (response.ok) {
        await fetchAccounts();
        alert('✅ Accounts refreshed!');
      } else {
        const data = await response.json();
        alert('Error: ' + (data.error || 'Failed to refresh'));
      }
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Failed to refresh'));
    } finally {
      setRefreshing(null);
    }
  };

  const handleDisconnect = async (itemId: string) => {
    if (!confirm('Are you sure you want to disconnect this account? This will delete all associated transactions.')) {
      return;
    }

    try {
      const response = await fetch('/api/accounts/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });

      if (response.ok) {
        await fetchAccounts();
        alert('✅ Account disconnected');
      } else {
        const data = await response.json();
        alert('Error: ' + (data.error || 'Failed to disconnect'));
      }
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Failed to disconnect'));
    }
  };

  const handleDeleteManualAccount = async (accountId: string) => {
    if (!confirm('Delete this account? Its balance history will be removed too.')) return;
    try {
      const response = await fetch(`/api/accounts/manual/${accountId}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchAccounts();
      } else {
        const data = await response.json();
        alert('Error: ' + (data.error || 'Failed to delete account'));
      }
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Failed to delete'));
    }
  };

  const startRenamingInstitution = (item: PlaidItem) => {
    setRenamingItemId(item.id);
    setInstitutionNameDraft(item.institutionName || '');
  };

  const handleSaveInstitutionName = async (itemId: string) => {
    if (!institutionNameDraft.trim()) return;
    try {
      const response = await fetch(`/api/accounts/institution/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionName: institutionNameDraft.trim() }),
      });
      if (response.ok) {
        await fetchAccounts();
        setRenamingItemId(null);
      } else {
        alert('Failed to rename connection');
      }
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Failed to rename'));
    }
  };

  const startEditing = (account: Account, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAccountId(account.id);
    setEditForm({
      displayName: account.displayName || account.name,
      icon: account.icon || 'Wallet',
      owner: account.owner || 'joint',
      currentBalance: account.currentBalance,
    });
  };

  const handleSaveEdit = async (account: Account) => {
    try {
      const response = await fetch('/api/accounts/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          displayName: editForm.displayName,
          icon: editForm.icon,
          owner: editForm.owner,
          ...(account.isManual ? { currentBalance: parseFloat(editForm.currentBalance) } : {}),
        }),
      });

      if (response.ok) {
        await fetchAccounts();
        setEditingAccountId(null);
      } else {
        alert('Failed to update account');
      }
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Failed to update'));
    }
  };

  const handleCreateLiability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liabilityForm.name.trim() || liabilityForm.currentBalance === '') {
      alert('Please enter a name and balance');
      return;
    }
    setSavingLiability(true);
    try {
      const response = await fetch('/api/accounts/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: liabilityForm.name,
          kind: liabilityForm.kind,
          liabilityType: liabilityForm.kind === 'liability' ? liabilityForm.liabilityType : undefined,
          currentBalance: parseFloat(liabilityForm.currentBalance),
          owner: liabilityForm.owner,
          icon: liabilityForm.icon,
        }),
      });

      if (response.ok) {
        await fetchAccounts();
        setShowAddLiability(false);
        setLiabilityForm({
          name: '',
          kind: 'liability',
          liabilityType: 'credit_card',
          currentBalance: '',
          owner: 'joint',
          icon: 'CreditCard',
        });
      } else {
        const data = await response.json();
        alert('Error: ' + (data.error || 'Failed to create account'));
      }
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Failed to create'));
    } finally {
      setSavingLiability(false);
    }
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'syncing':
        return <Clock className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  const getIconComponent = (iconName?: string) => {
    const icon = ICON_OPTIONS.find((opt) => opt.name === (iconName || 'Wallet'));
    if (icon) {
      return <icon.icon className="w-6 h-6" />;
    }
    return <Wallet className="w-6 h-6" />;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-4 md:p-8">
          <p className="text-muted-foreground">Loading accounts...</p>
        </div>
      </AppLayout>
    );
  }

  const hasAnyAccounts = items.some((item) => item.accounts.length > 0);

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Connected Accounts</h1>
            <p className="text-muted-foreground">Manage your linked bank accounts and sync data</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex p-0.5 rounded-lg bg-muted border border-border">
              <button
                onClick={() => changeViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
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
              onClick={() => setShowAddLiability(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-muted text-foreground font-semibold rounded-lg hover:bg-muted/80 border border-border transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Liability
            </button>
            <PlaidLinkButton />
          </div>
        </div>

        {!hasAnyAccounts ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center min-h-96 flex flex-col items-center justify-center">
            <div className="mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Accounts Yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Connect your bank to start tracking your accounts and transactions automatically.
              </p>
            </div>
            <PlaidLinkButton />
          </div>
        ) : (
          <div className="space-y-6">
            {items.filter((item) => item.accounts.length > 0).map((item) => (
              <div key={item.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
                {/* Institution Header */}
                <div className="flex items-center justify-between mb-6 pb-6 border-b border-border">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      {item.isManual ? (
                        <Landmark className="w-6 h-6 text-primary" />
                      ) : (
                        <CheckCircle className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      {renamingItemId === item.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            autoFocus
                            value={institutionNameDraft}
                            onChange={(e) => setInstitutionNameDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInstitutionName(item.id);
                              if (e.key === 'Escape') setRenamingItemId(null);
                            }}
                            placeholder="e.g. Chase, Wells Fargo"
                            className="px-2 py-1 text-lg font-semibold rounded border border-border bg-background text-foreground"
                          />
                          <button
                            onClick={() => handleSaveInstitutionName(item.id)}
                            className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setRenamingItemId(null)}
                            className="px-2 py-1 text-xs bg-muted text-foreground rounded hover:bg-muted/80"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/name">
                          <h2 className="text-lg font-semibold text-foreground">
                            {item.institutionName || 'Unnamed Connection'}
                          </h2>
                          <button
                            onClick={() => startRenamingInstitution(item)}
                            className="p-1 rounded opacity-0 group-hover/name:opacity-100 hover:bg-muted transition-all"
                            title="Rename"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {!item.isManual && (
                          <>
                            {getSyncStatusIcon(item.syncStatus)}
                            <span className="text-xs text-muted-foreground capitalize">
                              {item.syncStatus === 'idle' ? 'Synced' : item.syncStatus}
                            </span>
                            {item.lastSyncedAt && (
                              <span className="text-xs text-muted-foreground">
                                • {new Date(item.lastSyncedAt).toLocaleDateString()}
                              </span>
                            )}
                          </>
                        )}
                        {item.isManual && (
                          <span className="text-xs text-muted-foreground">
                            Manually tracked — no live sync
                          </span>
                        )}
                        {item.addedByUsername && (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor:
                                OWNERS[(item.addedByUsername as keyof typeof OWNERS) || 'joint']?.color + '1a',
                              color: OWNERS[(item.addedByUsername as keyof typeof OWNERS) || 'joint']?.color,
                            }}
                          >
                            Added by {OWNERS[(item.addedByUsername as keyof typeof OWNERS) || 'joint']?.emoji}{' '}
                            {OWNERS[(item.addedByUsername as keyof typeof OWNERS) || 'joint']?.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!item.isManual && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRefresh(item.id)}
                        disabled={refreshing === item.id}
                        className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                        title="Refresh accounts"
                      >
                        <RefreshCw className={`w-5 h-5 text-muted-foreground ${refreshing === item.id ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleDisconnect(item.id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Disconnect account"
                      >
                        <Trash2 className="w-5 h-5 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Error message */}
                {item.syncStatus === 'error' && item.lastError && (
                  <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-400">{item.lastError}</p>
                  </div>
                )}

                {/* Accounts */}
                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                      : 'flex flex-col gap-2'
                  }
                >
                  {item.accounts.map((account) =>
                    editingAccountId === account.id ? (
                      <div key={account.id} className="p-4 rounded-lg bg-muted border border-border space-y-3">
                        <input
                          type="text"
                          value={editForm.displayName}
                          onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                          placeholder="Account name"
                          className="w-full px-2 py-1 text-sm rounded border border-border bg-background text-foreground"
                        />
                        {account.isManual && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Balance:</p>
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.currentBalance}
                              onChange={(e) => setEditForm({ ...editForm, currentBalance: e.target.value })}
                              className="w-full px-2 py-1 text-sm rounded border border-border bg-background text-foreground"
                            />
                          </div>
                        )}
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Icon:</p>
                          <div className="flex gap-2 flex-wrap">
                            {ICON_OPTIONS.map((opt) => (
                              <button
                                key={opt.name}
                                onClick={() => setEditForm({ ...editForm, icon: opt.name })}
                                className={`p-2 rounded border transition-colors ${
                                  editForm.icon === opt.name
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:bg-muted'
                                }`}
                              >
                                <opt.icon className="w-5 h-5" />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Owner:</p>
                          <div className="flex gap-2">
                            {OWNER_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => setEditForm({ ...editForm, owner: opt.value })}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded border text-xs font-medium transition-colors ${
                                  editForm.owner === opt.value
                                    ? 'border-primary bg-primary/10 text-foreground'
                                    : 'border-border hover:bg-muted text-muted-foreground'
                                }`}
                              >
                                <span>{opt.emoji}</span>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(account)}
                            className="flex-1 px-2 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingAccountId(null)}
                            className="flex-1 px-2 py-1 text-sm bg-muted text-foreground rounded hover:bg-muted/80"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : viewMode === 'grid' ? (
                      <div
                        key={account.id}
                        onClick={() => router.push(`/accounts/${account.id}`)}
                        className="p-4 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border border-border hover:from-muted/80 hover:border-primary/40 transition-all group cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div
                            className="p-2 rounded-lg"
                            style={{
                              backgroundColor: getTypeBadge(account).color + '1a',
                              color: getTypeBadge(account).color,
                            }}
                          >
                            {getIconComponent(account.icon)}
                          </div>
                          <div className="flex items-center gap-1">
                            <span
                              className="text-sm px-2 py-0.5 rounded-full bg-muted/60 border border-border"
                              title={`Owner: ${
                                OWNER_OPTIONS.find((o) => o.value === (account.owner || 'joint'))?.label
                              }`}
                            >
                              {OWNER_OPTIONS.find((o) => o.value === (account.owner || 'joint'))?.emoji}
                            </span>
                            <button
                              onClick={(e) => startEditing(account, e)}
                              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                              title="Edit account"
                            >
                              <Edit2 className="w-4 h-4 text-muted-foreground" />
                            </button>
                            {account.isManual && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteManualAccount(account.id);
                                }}
                                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                                title="Delete account"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">
                          {account.displayName || account.name}
                        </p>
                        <span
                          className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full mb-2"
                          style={{
                            backgroundColor: getTypeBadge(account).color + '1a',
                            color: getTypeBadge(account).color,
                          }}
                        >
                          {getTypeBadge(account).label}
                        </span>
                        <p
                          className={`text-2xl font-bold mb-2 ${
                            account.kind === 'liability' ? 'text-red-500' : 'text-primary'
                          }`}
                        >
                          {account.kind === 'liability' ? '-' : ''}$
                          {Number(account.currentBalance).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {account.isManual
                            ? 'Click for details'
                            : account.lastSyncedAt
                            ? `Last synced ${new Date(account.lastSyncedAt).toLocaleDateString()}`
                            : 'Not synced yet'}
                        </p>
                      </div>
                    ) : (
                      <div
                        key={account.id}
                        onClick={() => router.push(`/accounts/${account.id}`)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/30 border border-border hover:bg-muted/60 hover:border-primary/40 transition-all group cursor-pointer"
                      >
                        <div
                          className="p-2 rounded-lg flex-shrink-0"
                          style={{
                            backgroundColor: getTypeBadge(account).color + '1a',
                            color: getTypeBadge(account).color,
                          }}
                        >
                          {getIconComponent(account.icon)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {account.displayName || account.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: getTypeBadge(account).color + '1a',
                                color: getTypeBadge(account).color,
                              }}
                            >
                              {getTypeBadge(account).label}
                            </span>
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              {account.isManual
                                ? 'Manual'
                                : account.lastSyncedAt
                                ? `Synced ${new Date(account.lastSyncedAt).toLocaleDateString()}`
                                : 'Not synced yet'}
                            </span>
                          </div>
                        </div>

                        <span
                          className="text-sm px-2 py-0.5 rounded-full bg-muted/60 border border-border flex-shrink-0 hidden sm:inline-block"
                          title={`Owner: ${
                            OWNER_OPTIONS.find((o) => o.value === (account.owner || 'joint'))?.label
                          }`}
                        >
                          {OWNER_OPTIONS.find((o) => o.value === (account.owner || 'joint'))?.emoji}
                        </span>

                        <p
                          className={`text-base font-semibold flex-shrink-0 w-32 text-right ${
                            account.kind === 'liability' ? 'text-red-500' : 'text-primary'
                          }`}
                        >
                          {account.kind === 'liability' ? '-' : ''}$
                          {Number(account.currentBalance).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </p>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => startEditing(account, e)}
                            className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                            title="Edit account"
                          >
                            <Edit2 className="w-4 h-4 text-muted-foreground" />
                          </button>
                          {account.isManual && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteManualAccount(account.id);
                              }}
                              className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                              title="Delete account"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Liability Modal */}
      {showAddLiability && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAddLiability(false)}
          />
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Add Manual Account</h2>
              <button
                onClick={() => setShowAddLiability(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLiability} className="space-y-4">
              <input
                type="text"
                placeholder="Name (e.g. Chase Sapphire, Student Loan)"
                value={liabilityForm.name}
                onChange={(e) => setLiabilityForm({ ...liabilityForm, name: e.target.value })}
                autoFocus
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              />

              <div className="flex gap-2">
                {(['liability', 'asset'] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setLiabilityForm({ ...liabilityForm, kind })}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${
                      liabilityForm.kind === kind
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {kind}
                  </button>
                ))}
              </div>

              {liabilityForm.kind === 'liability' && (
                <select
                  value={liabilityForm.liabilityType}
                  onChange={(e) => setLiabilityForm({ ...liabilityForm, liabilityType: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                >
                  {LIABILITY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              )}

              <input
                type="number"
                step="0.01"
                placeholder={liabilityForm.kind === 'liability' ? 'Amount owed' : 'Current value'}
                value={liabilityForm.currentBalance}
                onChange={(e) => setLiabilityForm({ ...liabilityForm, currentBalance: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              />

              <div>
                <p className="text-sm font-medium text-foreground mb-1.5">Owner</p>
                <div className="flex gap-2">
                  {OWNER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLiabilityForm({ ...liabilityForm, owner: opt.value })}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        liabilityForm.owner === opt.value
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <span>{opt.emoji}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={savingLiability}
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {savingLiability ? 'Saving...' : 'Add Account'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddLiability(false)}
                  className="px-4 py-2.5 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
