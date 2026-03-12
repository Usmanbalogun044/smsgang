'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import type { Order, PaginatedResponse } from '@/lib/types';

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25',
  paid: 'bg-blue-500/15 text-blue-400',
  processing: 'bg-indigo-500/15 text-indigo-400',
  completed: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25',
  failed: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/25',
  expired: 'bg-slate-500/15 text-slate-400',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 50, total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchOrders = (page = 1) => {
    setLoading(true);
    api.get<PaginatedResponse<Order>>(`/orders?page=${page}`)
      .then(({ data }) => { setOrders(data.data); setMeta(data.meta); })
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Orders</h1>
        <p className="text-sm text-slate-500 mt-1">All payment orders and their statuses</p>
      </div>

      {loading ? (
        <div className="bg-[#111424] rounded-2xl border border-[#1e2235] p-8">
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}</div>
        </div>
      ) : (
        <>
          <div className="bg-[#111424] rounded-2xl border border-[#1e2235] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e2235]">
                  {['#', 'User', 'Service', 'Country', 'Price', 'Status', 'Reference', 'Date'].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1d2e]">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#1a1e35]/40 transition-colors">
                    <td className="px-5 py-4 text-xs text-slate-600 font-mono">{order.id}</td>
                    <td className="px-5 py-4 text-sm text-slate-300">{order.user?.name || `User #${order.user_id}`}</td>
                    <td className="px-5 py-4 text-sm text-slate-300">{order.service?.name}</td>
                    <td className="px-5 py-4 text-sm text-slate-400">{order.country?.name}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-emerald-400">₦{order.price}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusStyles[order.status] || 'bg-slate-500/15 text-slate-400'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 font-mono">{order.payment_reference || '—'}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {new Date(order.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={meta.current_page} lastPage={meta.last_page} onPageChange={fetchOrders} />
        </>
      )}
    </div>
  );
}

