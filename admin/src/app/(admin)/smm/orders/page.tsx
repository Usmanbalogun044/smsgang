'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import useRealtimeRefresh from '@/hooks/useRealtimeRefresh';
import type { SmmOrder, User, PaginatedResponse } from '@/lib/types';

interface SmmOrderWithUser extends SmmOrder {
  user?: User;
}

const STATUS_COLORS: Record<string, string> = {
  'Pending': 'bg-yellow-100 text-yellow-700',
  'In progress': 'bg-blue-100 text-blue-700',
  'Partial': 'bg-orange-100 text-orange-700',
  'Completed': 'bg-green-100 text-green-700',
  'Failed': 'bg-red-100 text-red-700',
  'Cancelled': 'bg-slate-100 text-slate-700',
};

export default function AdminSmmOrdersPage() {
  const [orders, setOrders] = useState<SmmOrderWithUser[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | string>('all');

  const formatMoney = (value: number) =>
    `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const loadOrders = useCallback((currentPage = 1, silent = false) => {
    if (!silent) setLoading(true);

    const params = new URLSearchParams({ page: String(currentPage), per_page: '20' });
    if (filter !== 'all') params.append('status', filter);

    api
      .get<PaginatedResponse<SmmOrderWithUser>>(`/admin/smm/orders?${params.toString()}`)
      .then(({ data }) => {
        setOrders(data.data);
        setMeta(data.meta);
      })
      .catch(() => {
        if (!silent) toast.error('Failed to load orders');
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, [filter]);

  useEffect(() => {
    loadOrders(1);
    setPage(1);
  }, [filter]);

  useRealtimeRefresh(
    useCallback(() => {
      loadOrders(page, true);
    }, [loadOrders, page]),
    { intervalMs: 300000 }
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">SMM Orders</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Track all user SMM orders and statuses</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['all', 'Pending', 'In progress', 'Completed', 'Failed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-500'
              }`}
            >
              {f === 'all' ? 'All Orders' : f}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400 text-sm">Total Orders</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{meta.total.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400 text-sm">Completed</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{orders.filter(o => o.status === 'Completed').length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400 text-sm">In Progress</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{orders.filter(o => o.status === 'In progress').length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400 text-sm">Failed</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{orders.filter(o => o.status === 'Failed').length}</p>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No orders found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Order ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">User</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Service</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Qty</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Cost</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">CP Order ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">#{ order.id}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {order.user?.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
                        {order.smm_service?.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{order.quantity}</td>
                      <td className="px-6 py-4 text-sm font-bold text-blue-600">
                        {formatMoney(order.total_cost_ngn)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-700'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                        {order.crestpanel_order_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {meta.last_page > 1 && (
          <div className="flex justify-center">
            <Pagination
              currentPage={meta.current_page}
              lastPage={meta.last_page}
              onPageChange={(p) => {
                setPage(p);
                loadOrders(p);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
