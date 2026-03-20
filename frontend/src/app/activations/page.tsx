'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import type { Activation, PaginatedResponse } from '@/lib/types';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<string, { label: string; pulse: string; dot: string; text: string }> = {
  requested:       { label: 'Waiting...',    pulse: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', text: '' },
  number_received: { label: 'Number Ready',  pulse: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500',  text: '' },
  waiting_sms:     { label: 'Waiting...',    pulse: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', text: '' },
  sms_received:    { label: 'SMS Received',  pulse: 'bg-green-100 text-green-700', dot: 'bg-green-500', text: '' },
  completed:       { label: 'Completed',     pulse: 'bg-green-100 text-green-700', dot: 'bg-green-500', text: '' },
  expired:         { label: 'Expired',       pulse: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400', text: '' },
  cancelled:       { label: 'Cancelled',     pulse: 'bg-red-100 text-red-600',     dot: 'bg-red-400',   text: '' },
};

function useCountdown(expiresAt: string) {
  const getRemaining = () => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const [secs, setSecs] = useState(getRemaining);
  useEffect(() => {
    if (secs <= 0) return;
    const id = setInterval(() => setSecs(getRemaining()), 1000);
    return () => clearInterval(id);
  });
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return { label: `${mm}:${ss}`, expired: secs <= 0, low: secs < 120 };
}

function ExpiryCell({ expiresAt, status }: { expiresAt: string; status: string }) {
  const { label, expired, low } = useCountdown(expiresAt);
  if (['expired', 'cancelled', 'completed'].includes(status)) return <span className="text-slate-400 font-mono text-sm">—</span>;
  return <span className={`font-mono font-semibold text-sm ${expired || low ? 'text-red-500' : 'text-slate-900'}`}>{label}</span>;
}

export default function ActivationsPage() {
  const [activations, setActivations] = useState<Activation[]>([]);
  const [meta, setMeta] = useState<PaginatedResponse<Activation>['meta'] | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentBanner, setPaymentBanner] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading: authLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const fetchActivations = (p = page) => {
    setLoading(true);
    api.get(`/activations?page=${p}`)
      .then(({ data }) => { setActivations(data.data); setMeta(data.meta); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (user) fetchActivations(); }, [page, user]);

  // Auto-refresh activations every 2 seconds for real-time SMS updates
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      api.get(`/activations?page=${page}`)
        .then(({ data }) => { setActivations(data.data); setMeta(data.meta); })
        .catch(() => {}); // silent
    }, 2000);
    return () => clearInterval(interval);
  }, [user, page]);

  const cancelActivation = (id: number) => {
    api.post(`/activations/${id}/cancel`)
      .then(() => {
        setActivations((prev) => prev.map((a) => a.id === id ? { ...a, status: 'cancelled' as typeof a.status } : a));
        toast.success('Activation cancelled');
      })
      .catch(() => toast.error('Failed to cancel'));
  };

  const copyCode = (code: string) => { navigator.clipboard.writeText(code); toast.success('Code copied!'); };

  const filtered = activations.filter((a) =>
    !search || a.service?.name?.toLowerCase().includes(search.toLowerCase()) || a.phone_number?.includes(search)
  );

  const activeCount = activations.filter((a) => ['requested', 'number_received', 'waiting_sms', 'sms_received'].includes(a.status)).length;
  const total = activations.length;
  const successRate = total ? Math.round((activations.filter((a) => ['completed', 'sms_received'].includes(a.status)).length / total) * 100 * 10) / 10 : 0;

  const initials = user ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '';

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f7f8]">
      <DashboardSidebar mobileOpen={sidebarOpen} setMobileOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Navigation Header */}
        <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 bg-white px-4 md:px-6 py-3 flex-shrink-0">
          <div className="flex items-center gap-8">
            <button
              className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="flex items-center gap-4 text-[#0f6df0]">
              <div className="size-8 bg-[#0f6df0]/10 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-[#0f6df0] text-2xl">sms</span>
              </div>
              <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight">SMSGang</h2>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a href="/services" className="text-slate-600 hover:text-[#0f6df0] transition-colors text-sm font-medium">Dashboard</a>
              <a href="/activations" className="text-[#0f6df0] text-sm font-bold border-b-2 border-[#0f6df0] pb-1">Activations</a>
              <a href="/orders" className="text-slate-600 hover:text-[#0f6df0] transition-colors text-sm font-medium">History</a>
            </nav>
          </div>
          <div className="flex flex-1 justify-end gap-4 items-center">
            <label className="hidden sm:flex flex-col min-w-40 h-10 max-w-64">
              <div className="flex w-full flex-1 items-stretch rounded-lg h-full bg-slate-100">
                <div className="text-slate-400 flex items-center justify-center pl-3">
                  <span className="material-symbols-outlined text-xl">search</span>
                </div>
                <input
                  className="flex w-full min-w-0 flex-1 border-none bg-transparent focus:ring-0 text-sm font-normal placeholder:text-slate-400 px-3 outline-none"
                  placeholder="Search numbers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </label>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="bg-[#0f6df0]/10 text-[#0f6df0] border border-[#0f6df0]/20 rounded-full size-10 flex items-center justify-center font-bold text-sm">
                {initials}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-8 md:px-10 lg:px-14">
          {/* Payment Verified Banner */}
          {paymentBanner && (
            <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <span className="material-symbols-outlined text-xl">verified</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-green-800">Payment Verified</h4>
                  <p className="text-xs text-green-700">Your credits have been added. You can now activate new numbers.</p>
                </div>
              </div>
              <button onClick={() => setPaymentBanner(false)} className="text-green-800 hover:opacity-70 transition-opacity">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          )}

          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Active Numbers</h1>
              <p className="text-slate-500 mt-1">Real-time monitoring of your incoming verification codes</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => fetchActivations()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-300 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                Refresh
              </button>
              <a
                href="/services"
                className="flex items-center gap-2 px-6 py-2 bg-[#0f6df0] text-white rounded-lg font-bold text-sm hover:opacity-90 shadow-lg shadow-[#0f6df0]/20 transition-all"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                New Activation
              </a>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-slate-200 flex items-center gap-4">
              <div className="size-12 rounded-full bg-[#0f6df0]/10 flex items-center justify-center text-[#0f6df0]">
                <span className="material-symbols-outlined">radio_button_checked</span>
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Currently Active</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
                  {activeCount > 0 && <span className="text-green-500 text-xs font-bold">+{activeCount} new</span>}
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 flex items-center gap-4">
              <div className="size-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Success Rate</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-slate-900">{successRate}%</p>
                  {successRate > 0 && <span className="text-green-500 text-xs font-bold">↑ good</span>}
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 flex items-center gap-4">
              <div className="size-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                <span className="material-symbols-outlined">timer</span>
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Total Activations</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-slate-900">{meta?.total ?? total}</p>
                  <span className="text-slate-400 text-xs font-medium">all time</span>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-20 text-center">
                  <span className="material-symbols-outlined text-slate-300 block mb-4 text-6xl">sms</span>
                  <p className="text-slate-500 font-medium mb-2">No activations yet</p>
                  <a href="/services" className="text-sm font-semibold text-[#0f6df0]">Buy your first number →</a>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Service</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Code</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Expires In</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((a) => {
                      const cfg = STATUS_CONFIG[a.status] ?? { label: a.status, pulse: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' };
                      const isActive = ['requested', 'waiting_sms', 'number_received'].includes(a.status);
                      const hasCode = ['sms_received', 'completed'].includes(a.status) && a.sms_code;
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="size-10 bg-[#0f6df0]/10 rounded-lg flex items-center justify-center text-[#0f6df0] font-bold text-sm flex-shrink-0">
                                {a.service?.name?.charAt(0)?.toUpperCase() ?? '?'}
                              </div>
                              <span className="font-semibold text-slate-900">{a.service?.name ?? 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-slate-900 font-mono font-medium text-sm">{a.phone_number || '—'}</span>
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                {a.country?.flag && <span>{a.country.flag}</span>}
                                {a.country?.name ?? '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.pulse}`}>
                              <span className={`size-1.5 rounded-full ${cfg.dot} animate-pulse`}></span>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {hasCode ? (
                              <div className="flex items-center gap-2">
                                <div className="bg-[#0f6df0]/10 border border-[#0f6df0]/20 text-[#0f6df0] text-base font-black tracking-widest px-4 py-1.5 rounded-lg">
                                  {a.sms_code}
                                </div>
                                <button
                                  onClick={() => copyCode(a.sms_code!)}
                                  className="p-1.5 text-slate-400 hover:text-[#0f6df0] transition-colors"
                                >
                                  <span className="material-symbols-outlined text-lg">content_copy</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-8 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                                  <div className="flex gap-1">
                                    <div className="size-1.5 bg-slate-300 rounded-full animate-pulse"></div>
                                    <div className="size-1.5 bg-slate-300 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                    <div className="size-1.5 bg-slate-300 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <ExpiryCell expiresAt={a.expires_at} status={a.status} />
                          </td>
                          <td className="px-6 py-4">
                            {isActive && (
                              <button
                                onClick={() => cancelActivation(a.id)}
                                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-red-500 transition-colors flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-base">block</span>
                                Cancel
                              </button>
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
            {meta && meta.last_page > 0 && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">
                  Showing {filtered.length} of {meta.total} activations
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="size-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#0f6df0] transition-colors disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                  {Array.from({ length: Math.min(meta.last_page, 5) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`size-8 rounded-lg border flex items-center justify-center text-xs font-bold transition-colors ${
                          p === meta.current_page
                            ? 'border-[#0f6df0] bg-[#0f6df0] text-white'
                            : 'border-slate-200 text-slate-500 hover:border-[#0f6df0] hover:text-[#0f6df0]'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    disabled={page >= meta.last_page}
                    onClick={() => setPage(page + 1)}
                    className="size-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#0f6df0] transition-colors disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Info Boxes */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0f6df0]/5 p-4 rounded-xl border border-[#0f6df0]/20 flex gap-4">
              <span className="material-symbols-outlined text-[#0f6df0] flex-shrink-0">info</span>
              <div>
                <p className="text-sm font-bold text-slate-900">Tip: Auto-renewal</p>
                <p className="text-xs text-slate-500 mt-1">Numbers are held for 20 minutes by default. You can extend the duration if needed by clicking on the timer.</p>
              </div>
            </div>
            <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/20 flex gap-4">
              <span className="material-symbols-outlined text-amber-500 flex-shrink-0">warning</span>
              <div>
                <p className="text-sm font-bold text-slate-900">Refund Policy</p>
                <p className="text-xs text-slate-500 mt-1">If no SMS is received within the activation time, the full amount will be automatically refunded to your balance.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile FAB */}
      <div className="md:hidden fixed bottom-6 right-6">
        <a
          href="/services"
          className="size-14 rounded-full bg-[#0f6df0] text-white flex items-center justify-center shadow-2xl shadow-[#0f6df0]/40 hover:scale-105 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-2xl">add</span>
        </a>
      </div>
    </div>
  );
}
