'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { Order, PaginatedResponse } from '@/lib/types';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending:    { label: 'Pending Payment', bg: 'bg-amber-100', text: 'text-amber-800' },
  paid:       { label: 'Paid',           bg: 'bg-green-100', text: 'text-green-800' },
  processing: { label: 'Processing',     bg: 'bg-blue-100',  text: 'text-blue-800'  },
  completed:  { label: 'Completed',      bg: 'bg-green-100', text: 'text-green-800' },
  failed:     { label: 'Failed',         bg: 'bg-red-100',   text: 'text-red-800'   },
  expired:    { label: 'Expired',        bg: 'bg-slate-100', text: 'text-slate-500' },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState<PaginatedResponse<Order>['meta'] | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading: authLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.get(`/orders?page=${page}`)
      .then(({ data }) => { setOrders(data.data); setMeta(data.meta); })
      .finally(() => setLoading(false));
  }, [page, user]);

  const initials = user ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '';

  const filtered = orders.filter((o) => 
    !search || 
    String(o.id).includes(search) || 
    o.service?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f7f8]">
      <DashboardSidebar mobileOpen={sidebarOpen} setMobileOpen={setSidebarOpen} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-8 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              className="md:hidden mr-1 p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <span className="material-symbols-outlined text-[#0f6df0]">history</span>
            <h2 className="text-slate-900 text-lg font-bold tracking-tight">Order History</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative max-w-xs hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                className="w-64 pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#0f6df0] outline-none placeholder:text-slate-500"
                placeholder="Search orders..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="size-10 hidden md:flex items-center justify-center bg-slate-100 rounded-lg text-slate-600 hover:text-[#0f6df0] transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="bg-[#0f6df0]/10 text-[#0f6df0] border border-[#0f6df0]/20 rounded-full size-10 flex items-center justify-center font-bold text-sm">
              {initials}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-2xl font-bold text-slate-900">Your Orders</h3>
              <p className="text-slate-500 text-sm">Manage and track your previous SMS service direct payment orders.</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-8 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-20 text-center">
                    <span className="material-symbols-outlined text-slate-300 block mb-4 text-6xl">history</span>
                    <p className="text-slate-500 font-medium mb-2">No orders found</p>
                    <a href="/services" className="text-sm font-semibold text-[#0f6df0]">Buy a number →</a>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {['Order ID', 'Service', 'Country', 'Price (NGN)', 'Status', 'Date', 'Action'].map((h) => (
                          <th key={h} className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map((order) => {
                        const cfg = STATUS_CONFIG[order.status] ?? { label: order.status, bg: 'bg-slate-100', text: 'text-slate-500' };
                        return (
                          <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                              #ORD-{String(order.id).padStart(4, '0')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                <div className="size-8 bg-[#0f6df0]/10 rounded-lg flex items-center justify-center text-[#0f6df0] font-bold text-[10px]">
                                  {order.service?.name?.charAt(0).toUpperCase() ?? '?'}
                                </div>
                                {order.service?.name ?? 'SMS Activation'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                              <span className="mr-1">{order.country?.flag ?? '🌍'}</span>
                              {order.country?.name ?? '—'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                              ₦{Number(order.price).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                              {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              {order.lendoverify_checkout_url && order.status === 'pending' ? (
                                <a 
                                  href={order.lendoverify_checkout_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[#0f6df0] text-sm font-bold hover:underline"
                                >
                                  Pay Now
                                </a>
                              ) : (
                                <Link href={`/orders/${order.id}`} className="text-[#0f6df0] text-sm font-bold hover:underline">
                                  View Details
                                </Link>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              {meta && meta.last_page > 1 && (
                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-center gap-2">
                  <button 
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="size-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                  </button>
                  {Array.from({ length: Math.min(meta.last_page, 5) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <button 
                        key={p}
                        onClick={() => setPage(p)}
                        className={`size-8 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                          p === meta.current_page 
                            ? 'bg-[#0f6df0] text-white' 
                            : 'hover:bg-slate-100 text-slate-500'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button 
                    disabled={page >= meta.last_page}
                    onClick={() => setPage(page + 1)}
                    className="size-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
