'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import Pagination from '@/components/Pagination';
import toast from 'react-hot-toast';
import useRealtimeRefresh from '@/hooks/useRealtimeRefresh';
import type { PaginatedResponse, Transaction } from '@/lib/types';

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  payment_received_issue: 'bg-blue-100 text-blue-700',
  failed: 'bg-rose-100 text-rose-700',
};

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid + Fulfilled',
  payment_received_issue: 'Money Received (Issue)',
  failed: 'Failed',
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 30, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const fetchTransactions = (page = 1, statusFilter = status, silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter !== 'all') params.set('status', statusFilter);

    api
      .get<PaginatedResponse<Transaction>>(`/admin/transactions?${params.toString()}`)
      .then(({ data }) => {
        setTransactions(data.data);
        setMeta(data.meta);
      })
      .catch(() => {
        if (!silent) {
          toast.error('Failed to load transactions');
        }
      })
      .finally(() => {
        if (!silent) {
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    fetchTransactions(1, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useRealtimeRefresh(() => fetchTransactions(meta.current_page || 1, status, true));

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;

    return transactions.filter((tx) => {
      return (
        String(tx.id).includes(q) ||
        tx.reference?.toLowerCase().includes(q) ||
        tx.gateway_reference?.toLowerCase().includes(q) ||
        String(tx.order_id ?? '').includes(q) ||
        String(tx.user?.id ?? '').includes(q) ||
        tx.user?.name?.toLowerCase().includes(q) ||
        tx.user?.email?.toLowerCase().includes(q)
      );
    });
  }, [search, transactions]);

  const totalReceived = useMemo(
    () =>
      filteredTransactions
        .filter((tx) => ['paid', 'payment_received_issue'].includes(tx.status))
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
    [filteredTransactions]
  );

  const issueCount = useMemo(
    () => filteredTransactions.filter((tx) => tx.status === 'payment_received_issue').length,
    [filteredTransactions]
  );

  return (
    <div className="min-h-screen bg-[#f5f7f8] p-6 text-slate-900 md:p-8 dark:bg-[#101822] dark:text-slate-100">
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">Transactions</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">All payment records, including money received but fulfillment issues.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Total Records</p>
          <p className="mt-1 text-2xl font-black">{meta.total.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Money Received</p>
          <p className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-400">N{totalReceived.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Received With Issue</p>
          <p className="mt-1 text-2xl font-black text-blue-700 dark:text-blue-400">{issueCount}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row dark:border-slate-800">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by reference, order id, user..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f6df0] focus:ring-2 focus:ring-[#0f6df0]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f6df0] focus:ring-2 focus:ring-[#0f6df0]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid + Fulfilled</option>
            <option value="payment_received_issue">Money Received (Issue)</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-8 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                    </td>
                  </tr>
                ))
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-slate-700 dark:text-slate-200">{tx.reference}</div>
                      <div className="font-mono text-[11px] text-slate-400 dark:text-slate-500">{tx.gateway_reference || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{tx.user?.name || `User #${tx.user?.id ?? '-'}`}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{tx.user?.email || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">#{tx.order_id ?? '-'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">N{Number(tx.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                          statusStyles[tx.status] || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {statusLabel[tx.status] || tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {new Date(tx.created_at).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <Pagination currentPage={meta.current_page} lastPage={meta.last_page} onPageChange={(page) => fetchTransactions(page, status, false)} />
        </div>
      </div>
    </div>
  );
}
