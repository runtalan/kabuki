'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  Clock,
  Wallet,
  CreditCard,
  PiggyBank,
  TrendingUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AppLayout } from '@/components/app-layout';
import { CategoryIcon } from '@/components/category-icon';
import { MerchantAvatar } from '@/components/merchant-avatar';
import { OWNERS, OwnerAvatar } from '@/components/owner-badge';
import { householdMemberEntries } from '@/lib/households';
import { useHousehold } from '@/hooks/use-household';
import { getTypeBadge, LIABILITY_TYPES } from '@/lib/account-types';
import { formatNumber } from '@/lib/format';
import { ChartTooltip } from '@/components/charts/chart-tooltip';
import { TransactionEditModal } from '@/components/transaction-edit-modal';
import { useEscapeKey } from '@/hooks/use-escape-key';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Transaction {
  id: string;
  name: string;
  amount: string;
  type: 'debit' | 'credit';
  date: string;
  pending?: boolean;
  categoryId?: string | null;
  category?: Category | null;
  merchantLogoUrl?: string | null;
  ownerOverride?: string | null;
  account?: { owner?: string | null } | null;
  tags?: { id: string; name: string; color: string }[];
}

interface AccountDetail {
  id: string;
  name: string;
  displayName?: string | null;
  officialName?: string | null;
  icon?: string | null;
  owner: string;
  type: string;
  subtype?: string | null;
  kind: 'asset' | 'liability';
  liabilityType?: string | null;
  isManual: boolean;
  currentBalance: string;
  mask?: string | null;
  lastSyncedAt?: string | null;
  plaidItem: {
    id: string;
    institutionName?: string | null;
    syncStatus: 'idle' | 'syncing' | 'error';
    lastError?: string | null;
    lastSyncedAt?: string | null;
    isManual: boolean;
  };
}

const ICON_OPTIONS = [
  { name: 'Wallet', icon: Wallet },
  { name: 'CreditCard', icon: CreditCard },
  { name: 'PiggyBank', icon: PiggyBank },
  { name: 'TrendingUp', icon: TrendingUp },
  { name: 'CheckCircle', icon: CheckCircle },
];

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const household = useHousehold();

  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [history, setHistory] = useState<{ balance: string; recordedAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ displayName: '', icon: 'Wallet', owner: 'joint', currentBalance: '' });

  useEscapeKey(() => setEditOpen(false), editOpen);

  const fetchAll = async () => {
    try {
      const [accRes, txRes, histRes, catRes] = await Promise.all([
        fetch(`/api/accounts/${id}`),
        fetch(`/api/transactions?accountId=${id}`),
        fetch(`/api/accounts/${id}/history`),
        fetch('/api/categories'),
      ]);

      if (accRes.ok) {
        const data = await accRes.json();
        setAccount(data.account);
      }
      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(data.transactions || []);
      }
      if (histRes.ok) {
        const data = await histRes.json();
        setHistory(data.history || []);
      }
      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(data.categories || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const openEdit = () => {
    if (!account) return;
    setEditForm({
      displayName: account.displayName || account.name,
      icon: account.icon || 'Wallet',
      owner: account.owner || 'joint',
      currentBalance: account.currentBalance,
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!account) return;
    const res = await fetch('/api/accounts/update', {
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
    if (res.ok) {
      setEditOpen(false);
      await fetchAll();
    }
  };

  const handleRefresh = async () => {
    if (!account) return;
    setRefreshing(true);
    try {
      const res = await fetch('/api/accounts/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: account.plaidItem.id }),
      });
      if (res.ok) await fetchAll();
      else alert('Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!account) return;
    if (
      !confirm(
        'Disconnect this bank connection? This removes ALL accounts and transactions linked through it, not just this one.'
      )
    )
      return;
    const res = await fetch('/api/accounts/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: account.plaidItem.id }),
    });
    if (res.ok) router.push('/accounts');
    else alert('Failed to disconnect');
  };

  const handleDeleteManual = async () => {
    if (!account) return;
    if (!confirm('Delete this account and its history?')) return;
    const res = await fetch(`/api/accounts/manual/${account.id}`, { method: 'DELETE' });
    if (res.ok) router.push('/accounts');
    else alert('Failed to delete');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-4 md:p-8">
          <p className="text-muted-foreground">Loading account...</p>
        </div>
      </AppLayout>
    );
  }

  if (!account) {
    return (
      <AppLayout>
        <div className="p-4 md:p-8">
          <p className="text-muted-foreground">Account not found.</p>
          <Link href="/accounts" className="text-primary hover:underline text-sm">
            ← Back to accounts
          </Link>
        </div>
      </AppLayout>
    );
  }

  const badge = getTypeBadge(account);
  const Icon = ICON_OPTIONS.find((o) => o.name === (account.icon || 'Wallet'))?.icon || Wallet;
  const ownerInfo = OWNERS[(account.owner as keyof typeof OWNERS) || 'joint'];

  const chartData = history.map((p) => ({
    date: new Date(p.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    balance: Number(p.balance),
  }));

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All accounts
        </Link>

        {/* Header */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: badge.color + '1a', color: badge.color }}
              >
                <Icon className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {account.displayName || account.name}
                </h1>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: badge.color + '1a', color: badge.color }}
                  >
                    {badge.label}
                  </span>
                  {account.mask && (
                    <span className="text-xs text-muted-foreground">••{account.mask}</span>
                  )}
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full"
                    style={{ backgroundColor: ownerInfo.color + '1a', color: ownerInfo.color }}
                  >
                    <OwnerAvatar owner={account.owner} className="w-3.5 h-3.5" />
                    {ownerInfo.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={openEdit}
                className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Edit account"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              {!account.isManual ? (
                <>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors text-sm font-medium"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="p-2.5 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    title="Disconnect connection"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={handleDeleteManual}
                  className="p-2.5 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  title="Delete account"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p
                className={`text-4xl font-bold ${
                  account.kind === 'liability' ? 'text-red-500' : 'text-foreground'
                }`}
              >
                {account.kind === 'liability' ? '-' : ''}$
                {Number(account.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {account.plaidItem.institutionName}
              </p>
            </div>

            {/* Sync status */}
            <div className="text-right">
              {account.isManual ? (
                <p className="text-xs text-muted-foreground">Manually tracked — no live sync</p>
              ) : (
                <>
                  <div className="inline-flex items-center gap-1.5 justify-end">
                    {account.plaidItem.syncStatus === 'syncing' ? (
                      <Clock className="w-4 h-4 text-blue-500 animate-spin" />
                    ) : account.plaidItem.syncStatus === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    )}
                    <span className="text-sm font-medium text-foreground capitalize">
                      {account.plaidItem.syncStatus === 'idle' ? 'Synced' : account.plaidItem.syncStatus}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last synced{' '}
                    {account.plaidItem.lastSyncedAt
                      ? new Date(account.plaidItem.lastSyncedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      : 'never'}
                  </p>
                  {account.plaidItem.syncStatus === 'error' && account.plaidItem.lastError && (
                    <p className="text-xs text-red-500 mt-1 max-w-xs">{account.plaidItem.lastError}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Balance history chart */}
        {chartData.length >= 2 && (
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Balance History</h2>
            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="detailGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={account.kind === 'liability' ? '#ef4444' : '#3b82f6'}
                        stopOpacity={0.7}
                      />
                      <stop
                        offset="95%"
                        stopColor={account.kind === 'liability' ? '#ef4444' : '#3b82f6'}
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(v) => `$${formatNumber(v)}`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    name="Balance"
                    stroke={account.kind === 'liability' ? '#ef4444' : '#3b82f6'}
                    fill="url(#detailGradient)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Transactions table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              Transactions <span className="text-muted-foreground font-normal">({transactions.length})</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Merchant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      onClick={() => setEditingTx(tx)}
                      className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-3 text-sm text-foreground font-medium">
                        <div className="flex items-center gap-2.5">
                          <MerchantAvatar
                            logoUrl={tx.merchantLogoUrl}
                            categoryIcon={tx.category?.icon}
                            categoryColor={tx.category?.color}
                            name={tx.name}
                            className="w-7 h-7"
                            iconClassName="w-3 h-3"
                          />
                          <span>
                            {tx.name}
                            {tx.pending && (
                              <span className="ml-2 text-[10px] text-amber-500 font-medium">Pending</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: (tx.category?.color || '#6b7280') + '1a',
                            color: tx.category?.color || '#6b7280',
                          }}
                        >
                          <CategoryIcon icon={tx.category?.icon} className="w-3 h-3" />
                          {tx.category?.name || 'Untagged'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td
                        className={`px-6 py-3 text-sm font-semibold text-right ${
                          tx.type === 'credit' ? 'text-emerald-500' : 'text-foreground'
                        }`}
                      >
                        {tx.type === 'credit' ? '+' : ''}$
                        {Math.abs(parseFloat(tx.amount)).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground text-sm">
                      No transactions on this account yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit account modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditOpen(false)} />
          <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Edit Account</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={editForm.displayName}
                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                placeholder="Account name"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground"
              />
              {account.isManual && (
                <input
                  type="number"
                  step="0.01"
                  value={editForm.currentBalance}
                  onChange={(e) => setEditForm({ ...editForm, currentBalance: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground"
                />
              )}
              <div className="flex gap-2 flex-wrap">
                {ICON_OPTIONS.map((opt) => (
                  <button
                    key={opt.name}
                    onClick={() => setEditForm({ ...editForm, icon: opt.name })}
                    className={`p-2 rounded-lg border transition-colors ${
                      editForm.icon === opt.name ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'
                    }`}
                  >
                    <opt.icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {(household ? householdMemberEntries(household) : []).map(
                  ([value, info]) => (
                    <button
                      key={value}
                      onClick={() => setEditForm({ ...editForm, owner: value })}
                      className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        editForm.owner === value
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <OwnerAvatar owner={value} className="w-3.5 h-3.5" />
                      {info.label}
                    </button>
                  )
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2 bg-muted text-foreground text-sm rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingTx && (
        <TransactionEditModal
          transaction={editingTx}
          categories={categories}
          onClose={() => setEditingTx(null)}
          onSaved={fetchAll}
        />
      )}
    </AppLayout>
  );
}
