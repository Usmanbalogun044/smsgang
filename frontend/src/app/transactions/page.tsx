'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';
import DashboardSidebar from '@/components/DashboardSidebar';
import type { WalletTransaction, PaginatedResponse } from '@/lib/types';

export default function TransactionsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const formatMoney = (value: number) =>
    `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const loadTransactions = useCallback((silent = false) => {
    if (!silent) setLoading(true);

    Promise.all([
      api.get<{ balance: number }>('/wallet/balance'),
      api.get<PaginatedResponse<WalletTransaction>>('/wallet/transactions?per_page=20'),
    ])
      .then(([balanceRes, transRes]) => {
        setWalletBalance(Number(balanceRes.data.balance || 0));
        setTransactions(transRes.data.data || []);
      })
      .catch(() => {
        if (!silent) toast.error('Failed to load transactions');
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadTransactions();
    }
  }, [authLoading, user, router, loadTransactions]);

  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f7f8]">
        <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">refresh</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f7f8]">
      <DashboardSidebar mobileOpen={sidebarOpen} setMobileOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="border-b border-slate-200 bg-white px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Transactions</h2>
            <p className="text-sm text-slate-600 mt-1">Track wallet credits and service deductions</p>
          </div>
          <button
            onClick={() => router.push('/wallet/fund')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0f6df0] text-white font-semibold rounded-lg hover:bg-[#0d5ed9] transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
            Fund Wallet
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-6">
            <div className="bg-gradient-to-br from-[#0f6df0] to-blue-700 rounded-2xl p-6 text-white shadow-lg">
              <p className="text-blue-100 text-sm uppercase tracking-wider mb-1">Current Wallet Balance</p>
              <h3 className="text-4xl font-black">{formatMoney(walletBalance)}</h3>
              <p className="text-blue-100 text-xs mt-2">Withdrawals are not available for user wallets.</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">Recent Transactions</h3>
                <button
                  onClick={() => loadTransactions()}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[#0f6df0] hover:bg-[#0f6df0]/10 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="text-center py-10 text-slate-500">Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-2 block">receipt_long</span>
                  <p>No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => {
                    const isCredit = tx.type === 'credit';
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isCredit ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                            }`}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                              {isCredit ? 'arrow_downward' : 'arrow_upward'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 capitalize">{tx.operation_type}</p>
                            <p className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                        <p className={`text-base font-bold ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isCredit ? '+' : '-'}{formatMoney(tx.amount)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
