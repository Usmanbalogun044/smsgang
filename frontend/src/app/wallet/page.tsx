'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import useRealtimeRefresh from '@/hooks/useRealtimeRefresh';
import DashboardSidebar from '@/components/DashboardSidebar';
import type { Wallet, WalletTransaction, PaginatedResponse } from '@/lib/types';

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const formatMoney = (value: number) =>
    `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const loadWallet = useCallback((silent = false) => {
    if (!silent) setLoading(true);

    Promise.all([
      api.get<{ balance: number }>('/wallet/balance'),
      api.get<PaginatedResponse<WalletTransaction>>('/wallet/transactions?per_page=10'),
    ])
      .then(([balanceRes, transRes]) => {
        setWallet({ id: 1, user_id: 1, balance: balanceRes.data.balance, created_at: '', updated_at: '' });
        setTransactions(transRes.data.data);
      })
      .catch(() => {
        if (!silent) toast.error('Failed to load wallet');
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  useRealtimeRefresh(
    useCallback(() => {
      loadWallet(true);
    }, [loadWallet]),
    { intervalMs: 3600000 }
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f7f8]">
      <DashboardSidebar mobileOpen={sidebarOpen} setMobileOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white px-6 lg:px-8 py-4">
          <h2 className="text-lg font-bold text-slate-900">My Wallet</h2>
          <p className="text-sm text-slate-600 mt-1">Manage your account balance and track transactions</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-8">
        {loading ? (
          <div className="text-center text-slate-500">Loading wallet...</div>
        ) : (
          <>
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 text-white shadow-lg">
              <p className="text-blue-100 mb-2 text-sm uppercase tracking-wider">Current Balance</p>
              <h2 className="text-5xl font-bold mb-6">{formatMoney(wallet?.balance || 0)}</h2>
              <div className="flex gap-4">
                <a href="/wallet/fund" className="px-6 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-slate-100 transition-colors">
                  Add Funds
                </a>
                <a href="/wallet/transactions" className="px-6 py-3 border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition-colors">
                  View All Transactions
                </a>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Recent Transactions</h3>
              
              {transactions.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No transactions yet</p>
              ) : (
                <div className="space-y-4">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                      <div className="flex items-center gap-4">
                        <div className={`size-12 rounded-full flex items-center justify-center ${
                          tx.type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          <span className={tx.type === 'credit' ? 'text-green-600 text-2xl' : 'text-red-600 text-2xl'}>
                            {tx.type === 'credit' ? '↓' : '↑'}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white capitalize">{tx.operation_type}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{new Date(tx.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <p className={`text-lg font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'credit' ? '+' : '-'}{formatMoney(tx.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
