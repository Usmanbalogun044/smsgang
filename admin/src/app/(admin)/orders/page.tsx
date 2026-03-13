'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import type { Order, PaginatedResponse } from '@/lib/types';

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-blue-100 text-blue-700',
  processing: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  expired: 'bg-slate-100 text-slate-600',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 50, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchOrders = (page = 1) => {
    setLoading(true);
    api.get<PaginatedResponse<Order>>(`/admin/orders?page=${page}`)
      .then(({ data }) => { setOrders(data.data); setMeta(data.meta); })
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, []);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }

      if (!query) return true;

      return (
        String(order.id).includes(query) ||
        order.service?.name?.toLowerCase().includes(query) ||
        order.country?.name?.toLowerCase().includes(query) ||
        order.payment_reference?.toLowerCase().includes(query) ||
        String(order.user_id).includes(query)
      );
    });
  }, [orders, search, statusFilter]);

  const totalRevenue = useMemo(
    () => filteredOrders.reduce((sum, order) => sum + Number(order.price || 0), 0),
    [filteredOrders],
  );

  const paidCount = useMemo(
    () => filteredOrders.filter((order) => ['paid', 'completed'].includes(order.status)).length,
    [filteredOrders],
  );

  const pendingCount = useMemo(
    () => filteredOrders.filter((order) => ['pending', 'processing'].includes(order.status)).length,
    [filteredOrders],
  );

  const failedCount = useMemo(
    () => filteredOrders.filter((order) => ['failed', 'expired'].includes(order.status)).length,
    [filteredOrders],
  );

  const statuses = [
    { value: 'all', label: `All Orders (${filteredOrders.length})` },
    { value: 'paid', label: 'Paid' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' },
  ];

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500 bg-[#f5f7f8] text-slate-900 dark:bg-[#101822] dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur md:px-10 dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#0f6df0] text-white">
              <span className="material-symbols-outlined">ad_units</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">SMSGang Admin</h1>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Order Management</p>
            </div>
          </div>
          <button className="flex items-center gap-2 rounded-xl bg-[#0f6df0] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-[#0f6df0]/25 transition hover:opacity-90">
            <span className="material-symbols-outlined text-base">download</span>
            Export Data
          </button>
        </div>
      </header>

      <section className="mx-auto w-full max-w-[1400px] px-6 py-8 lg:px-10">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Order Management</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Monitoring all transactions on the SMSGang platform</p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">search</span>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by Order ID, reference, user id, service, country..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#0f6df0] focus:ring-2 focus:ring-[#0f6df0]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
          </div>
          <div className="flex gap-2 lg:col-span-4">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0f6df0] focus:ring-2 focus:ring-[#0f6df0]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="expired">Expired</option>
            </select>
            <button className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700" aria-label="Filter options">
              <span className="material-symbols-outlined">filter_list</span>
            </button>
          </div>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
          {statuses.map((item) => (
            <button
              key={item.value}
              onClick={() => setStatusFilter(item.value)}
              className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                statusFilter === item.value
                  ? 'border-[#0f6df0]/30 bg-[#0f6df0]/10 text-[#0f6df0]'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-[#0f6df0]/25 hover:text-[#0f6df0] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Service</th>
                  <th className="px-6 py-4">Price (NGN)</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Reference</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={8} className="px-6 py-4">
                        <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                      </td>
                    </tr>
                  ))
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      No orders found for the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-mono font-bold text-[#0f6df0]">#SMS-{String(order.id).padStart(6, '0')}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{order.user?.name ?? `User #${order.user_id}`}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{order.user?.email ?? 'Unknown email'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-700 dark:text-slate-200">{order.service?.name ?? 'Unknown service'}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{order.country?.name ?? 'Unknown country'}</div>
                      </td>
                      <td className="px-6 py-4 font-bold">₦{Number(order.price || 0).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${statusStyles[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {new Date(order.created_at).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">{order.payment_reference ?? 'N/A'}</td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/orders/${order.id}`} className="inline-flex items-center rounded-lg p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200" aria-label={`View order ${order.id}`}>
                          <span className="material-symbols-outlined">visibility</span>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 text-sm text-slate-500 md:flex-row md:items-center dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
            <span>
              Showing {filteredOrders.length} of {meta.total.toLocaleString()} orders
            </span>
            <Pagination currentPage={meta.current_page} lastPage={meta.last_page} onPageChange={fetchOrders} />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Revenue (Filtered)</p>
            <h3 className="text-2xl font-black tracking-tight">₦{totalRevenue.toLocaleString()}</h3>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Paid Orders</p>
            <h3 className="text-2xl font-black tracking-tight text-green-600">{paidCount}</h3>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pending Orders</p>
            <h3 className="text-2xl font-black tracking-tight text-amber-600">{pendingCount}</h3>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Failed/Expired</p>
            <h3 className="text-2xl font-black tracking-tight text-red-600">{failedCount}</h3>
          </div>
        </div>
      </section>
    </div>
  );
}

