'use client';
'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import type { Activation, PaginatedResponse } from '@/lib/types';

const STATUS_LABEL: Record<string, string> = {
  requested: 'Requested',
  number_received: 'Number Received',
  waiting_sms: 'Waiting SMS',
  sms_received: 'Received',
  completed: 'Completed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

const STATUS_BADGE: Record<string, string> = {
  requested: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
  number_received: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
  waiting_sms: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
  sms_received: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
  completed: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
  expired: 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400',
  cancelled: 'bg-slate-100 dark:bg-slate-700 text-slate-500',
};

const ACTIVE_STATUSES = ['requested', 'number_received', 'waiting_sms', 'sms_received'];
const TERMINAL_STATUSES = ['completed', 'expired', 'cancelled'];

function expiresIn(expiresAt: string): { label: string; urgent: boolean } {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { label: '00:00', urgent: false };
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return {
    label: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
    urgent: diff < 5 * 60 * 1000,
  };
}

type FilterTab = 'all' | 'active' | 'completed' | 'cancelled';

export default function ActivationsPage() {
  const [activations, setActivations] = useState<Activation[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 50, total: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchActivations = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: '20' });
    if (tab === 'active') params.set('status', 'waiting_sms');
    else if (tab === 'completed') params.set('status', 'completed');
    else if (tab === 'cancelled') params.set('status', 'cancelled');
    api.get<PaginatedResponse<Activation>>(`/admin/activations?${params}`)
      .then(({ data }) => { setActivations(data.data); setMeta(data.meta); })
      .catch(() => toast.error('Failed to load activations'))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { fetchActivations(1); }, [fetchActivations]);

  const handleExpire = async (activation: Activation) => {
    if (!confirm('Force expire this activation?')) return;
    try {
      await api.post(`/admin/activations/${activation.id}/expire`);
      toast.success('Activation expired');
      fetchActivations(meta.current_page);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to expire');
    }
  };

  const filtered = search.trim()
    ? activations.filter((a) => {
        const q = search.toLowerCase();
        return (
          a.phone_number?.toLowerCase().includes(q) ||
          a.service?.name?.toLowerCase().includes(q) ||
          a.order?.user?.email?.toLowerCase().includes(q)
        );
      })
    : activations;

  const activeCount = activations.filter((a) => ACTIVE_STATUSES.includes(a.status)).length;

  void tick; // drives live countdown re-renders

  return (
    <div className="animate-in fade-in duration-500">
      {/* Sticky Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#0f6df0]/10 rounded-xl flex items-center justify-center text-[#0f6df0]">
            <span className="material-symbols-outlined !text-2xl">cell_tower</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Active Activations</h1>
            <p className="text-xs font-semibold text-slate-400">Real-time monitoring of all phone sessions</p>
          </div>
        </div>
        <button
          onClick={() => fetchActivations(meta.current_page)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0f6df0] text-white rounded-lg text-sm font-bold shadow-md hover:bg-[#0d5ed9] transition-colors"
        >
          <span className="material-symbols-outlined !text-lg">refresh</span> Refresh
        </button>
      </div>

      <div className="p-8 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Results</p>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                <span className="material-symbols-outlined !text-xl">bolt</span>
              </div>
            </div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{meta.total.toLocaleString()}</h3>
            <p className="text-xs text-slate-400 mt-2">With current filter</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Waiting SMS</p>
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
                <span className="material-symbols-outlined !text-xl">timer</span>
              </div>
            </div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{activeCount}</h3>
            <p className="text-xs text-slate-400 mt-2">On current page</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pages</p>
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                <span className="material-symbols-outlined !text-xl">library_books</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{meta.current_page}</h3>
              <span className="text-sm text-slate-400 font-semibold">/ {meta.last_page}</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">{meta.total.toLocaleString()} total records</p>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-sm">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 !text-lg">search</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by email, phone, or service…"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-[#0f6df0]/20 outline-none text-slate-800 dark:text-slate-200 transition"
                />
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                {(['all', 'active', 'completed', 'cancelled'] as FilterTab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors capitalize ${
                      tab === t
                        ? 'bg-white dark:bg-slate-700 shadow-sm text-[#0f6df0]'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Data Table */}
          {loading ? (
            <div className="p-8 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    {['User Email', 'Service', 'Country', 'Phone Number', 'SMS Code', 'Expires In', 'Status', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 ${h === 'Actions' ? 'text-right' : ''}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center text-slate-400 text-sm">
                        No activations found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((a) => {
                      const isActive = ACTIVE_STATUSES.includes(a.status);
                      const { label: countdown, urgent } = expiresIn(a.expires_at);
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className={`size-2 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                                {a.order?.user?.email ?? '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                            {a.service?.name ?? '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                            {a.country?.name ?? '—'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200">{a.phone_number}</span>
                          </td>
                          <td className="px-6 py-4">
                            {a.sms_code ? (
                              <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded text-sm font-black tracking-widest text-emerald-600 dark:text-emerald-400">
                                {a.sms_code}
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-sm font-bold tracking-widest text-slate-400">------</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-sm font-semibold ${urgent ? 'text-rose-500' : isActive ? 'text-amber-500' : 'text-slate-400'}`}>
                              {countdown}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[a.status] ?? 'bg-slate-100 text-slate-500'}`}>
                              {STATUS_LABEL[a.status] ?? a.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {!TERMINAL_STATUSES.includes(a.status) && (
                              <button
                                onClick={() => handleExpire(a)}
                                title="Force Expire"
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-all"
                              >
                                <span className="material-symbols-outlined !text-lg">cancel</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              {meta.total > 0
                ? `Showing ${Math.min((meta.current_page - 1) * meta.per_page + 1, meta.total)}–${Math.min(meta.current_page * meta.per_page, meta.total)} of ${meta.total.toLocaleString()} results`
                : 'No results'}
            </p>
            <Pagination currentPage={meta.current_page} lastPage={meta.last_page} onPageChange={fetchActivations} />
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-start gap-4 p-4 rounded-xl bg-[#0f6df0]/5 border border-[#0f6df0]/10">
          <span className="material-symbols-outlined text-[#0f6df0] mt-0.5 flex-shrink-0">info</span>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Real-time countdown active</h4>
            <p className="text-xs text-slate-500 mt-1">Timers update every second. Click Refresh to reload data from the server. Expired sessions are cleaned up automatically.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

