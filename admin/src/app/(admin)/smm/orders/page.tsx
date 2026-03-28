'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import useRealtimeRefresh from '@/hooks/useRealtimeRefresh';
import type { SmmOrder, User, PaginatedResponse } from '@/lib/types';

interface DetailedSmmOrder extends SmmOrder {
  runs?: number;
  interval?: number;
  comments?: string;
  price_per_unit?: string | number;
  total_units?: number;
  charge_ngn?: string | number;
  exchange_rate_used?: string | number;
  markup_type_used?: string;
  markup_value_used?: string | number;
  link?: string;
  updated_at?: string;
  provider_payload?: any;
  user?: User;
  smm_service?: {
    id?: number;
    name?: string;
    category?: string;
    type?: string;
  };
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
  const [orders, setOrders] = useState<DetailedSmmOrder[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | string>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const formatMoney = (value: number) =>
    `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const loadOrders = useCallback((currentPage = 1, silent = false) => {
    if (!silent) setLoading(true);

    const params = new URLSearchParams({ page: String(currentPage), per_page: '20' });
    if (filter !== 'all') params.append('status', filter);

    api
      .get<PaginatedResponse<DetailedSmmOrder>>(`/admin/smm/orders?${params.toString()}`)
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
          <p className="text-slate-600 dark:text-slate-400 mt-2">Track all user SMM orders, statuses, and complete details</p>
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
            <p className="text-slate-600 dark:text-slate-400 text-sm">Page</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{meta.current_page} / {meta.last_page}</p>
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
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-900 dark:text-white w-10">•</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Order ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">User</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Service</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Qty</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Cost</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {orders.map((order) => (
                    <tbody key={order.id}>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                          onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                        <td className="px-4 py-4 text-center">
                          <span className={`transform transition-transform ${expandedId === order.id ? 'rotate-90' : ''}`}>
                            ▶
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">#{order.id}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {order.user?.email || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
                          {order.smm_service?.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{order.quantity}</td>
                        <td className="px-6 py-4 text-sm font-bold text-blue-600">
                          {formatMoney(Number(order.total_cost_ngn))}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-700'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                      {expandedId === order.id && (
                        <tr className="bg-slate-100 dark:bg-slate-700/30">
                          <td colSpan={8} className="px-6 py-6">
                            <div className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* CrestPanel Order ID */}
                                <div>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">CP Order ID</p>
                                  <p className="text-sm font-mono text-slate-900 dark:text-white mt-1">{order.crestpanel_order_id || '—'}</p>
                                </div>

                                {/* Link */}
                                <div>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Link</p>
                                  <p className="text-sm text-slate-900 dark:text-white mt-1 truncate">{order.link || '—'}</p>
                                </div>

                                {/* Price Per Unit */}
                                <div>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Price Per Unit</p>
                                  <p className="text-sm text-slate-900 dark:text-white mt-1">{formatMoney(Number(order.price_per_unit) || 0)}</p>
                                </div>

                                {/* Total Units */}
                                <div>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total Units</p>
                                  <p className="text-sm text-slate-900 dark:text-white mt-1">{order.total_units || '—'}</p>
                                </div>

                                {/* Charge NGN */}
                                <div>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Charge (NGN)</p>
                                  <p className="text-sm text-slate-900 dark:text-white mt-1">{formatMoney(Number(order.charge_ngn) || 0)}</p>
                                </div>

                                {/* Exchange Rate */}
                                <div>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Exchange Rate Used</p>
                                  <p className="text-sm text-slate-900 dark:text-white mt-1">{Number(order.exchange_rate_used || 0).toFixed(4)}</p>
                                </div>

                                {/* Markup Type Used */}
                                <div>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Markup Type Used</p>
                                  <p className="text-sm text-slate-900 dark:text-white mt-1">{order.markup_type_used || '—'}</p>
                                </div>

                                {/* Markup Value Used */}
                                <div>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Markup Value Used</p>
                                  <p className="text-sm text-slate-900 dark:text-white mt-1">{order.markup_value_used || '—'}</p>
                                </div>

                                {/* Runs */}
                                <div>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Runs</p>
                                  <p className="text-sm text-slate-900 dark:text-white mt-1">{order.runs || '—'}</p>
                                </div>

                                {/* Interval */}
                                <div>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Interval</p>
                                  <p className="text-sm text-slate-900 dark:text-white mt-1">{order.interval ? `${order.interval}h` : '—'}</p>
                                </div>

                                {/* Comments */}
                                <div>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Comments</p>
                                  <p className="text-sm text-slate-900 dark:text-white mt-1">{order.comments || '—'}</p>
                                </div>

                                {/* Updated At */}
                                <div>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Updated At</p>
                                  <p className="text-sm text-slate-900 dark:text-white mt-1">
                                    {order.updated_at ? new Date(order.updated_at).toLocaleString() : '—'}
                                  </p>
                                </div>
                              </div>

                              {/* Provider Payload */}
                              {order.provider_payload && Object.keys(order.provider_payload).length > 0 && (
                                <div>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">Provider Response</p>
                                  <pre className="bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto max-h-64">
                                    {JSON.stringify(order.provider_payload, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
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
