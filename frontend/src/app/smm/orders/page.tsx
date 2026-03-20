'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import useRealtimeRefresh from '@/hooks/useRealtimeRefresh';
import DashboardSidebar from '@/components/DashboardSidebar';
import Pagination from '@/components/Pagination';
import type { SmmOrder, PaginatedResponse } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  'Pending': 'bg-yellow-100 text-yellow-700',
  'In progress': 'bg-blue-100 text-blue-700',
  'Partial': 'bg-orange-100 text-orange-700',
  'Completed': 'bg-green-100 text-green-700',
  'Failed': 'bg-red-100 text-red-700',
  'Cancelled': 'bg-slate-100 text-slate-700',
};

export default function SmmOrdersPage() {
  const [orders, setOrders] = useState<SmmOrder[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'Pending' | 'In progress' | 'Completed' | 'Failed'>('all');
  const [selectedOrder, setSelectedOrder] = useState<SmmOrder | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const formatMoney = (value: number) =>
    `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const loadOrders = useCallback((currentPage = 1, silent = false) => {
    if (!silent) setLoading(true);

    const params = new URLSearchParams({ page: String(currentPage), per_page: '20' });
    if (filter !== 'all') params.append('status', filter);

    api
      .get<PaginatedResponse<SmmOrder>>(`/smm/orders?${params.toString()}`)
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
    <div className="flex h-screen overflow-hidden bg-[#f5f7f8]">
      <DashboardSidebar mobileOpen={sidebarOpen} setMobileOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white px-6 lg:px-8 py-4">
          <h2 className="text-lg font-bold text-slate-900">My Boost Social Orders</h2>
          <p className="text-sm text-slate-600 mt-1">Track all your social media growth orders in real-time</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8">
            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {['all', 'Pending', 'In progress', 'Completed', 'Failed'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
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

            {/* Orders Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-slate-500">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No orders found. <a href="/smm/services" className="text-blue-600 hover:underline">Start ordering now</a>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Service Name</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Link</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Qty</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Total</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Status</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Date</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">{order.smm_service?.name || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <a href={order.link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline line-clamp-1">
                              {order.link}
                            </a>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{order.quantity}</td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">{formatMoney(order.total_cost_ngn)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-700'}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-semibold"
                            >
                              View
                            </button>
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
              <div className="mt-6 flex justify-center gap-2">
                <button
                  onClick={() => {
                    const newPage = Math.max(1, page - 1);
                    setPage(newPage);
                    loadOrders(newPage);
                  }}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, meta.last_page) }).map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => {
                        setPage(pageNum);
                        loadOrders(pageNum);
                      }}
                      className={`px-3 py-2 rounded-lg ${
                        page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => {
                    const newPage = Math.min(meta.last_page, page + 1);
                    setPage(newPage);
                    loadOrders(newPage);
                  }}
                  disabled={page === meta.last_page}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Order #{selectedOrder.id}</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Service</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{selectedOrder.smm_service?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Link Provided</p>
                <a href={selectedOrder.link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate">
                  {selectedOrder.link}
                </a>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Quantity</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">{selectedOrder.quantity}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Cost</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatMoney(selectedOrder.total_cost_ngn)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 ${STATUS_COLORS[selectedOrder.status] || 'bg-slate-100 text-slate-700'}`}>
                  {selectedOrder.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">CrestPanel Order ID</p>
                <p className="text-sm font-mono text-slate-900 dark:text-white break-all mt-1">{selectedOrder.crestpanel_order_id}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Ordered</p>
                <p className="text-sm text-slate-900 dark:text-white">{new Date(selectedOrder.created_at).toLocaleString()}</p>
              </div>
            </div>

            <button
              onClick={() => setSelectedOrder(null)}
              className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
