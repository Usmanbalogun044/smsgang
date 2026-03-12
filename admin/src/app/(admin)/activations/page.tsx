'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import type { Activation, PaginatedResponse } from '@/lib/types';

const STATUS_OPTIONS = [
  '', 'requested', 'number_received', 'waiting_sms', 'sms_received', 'completed', 'expired', 'cancelled',
];

const statusStyles: Record<string, string> = {
  requested: 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/25',
  number_received: 'bg-indigo-500/15 text-indigo-400',
  waiting_sms: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25',
  sms_received: 'bg-emerald-500/15 text-emerald-400',
  completed: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25',
  expired: 'bg-slate-500/15 text-slate-400',
  cancelled: 'bg-slate-500/15 text-slate-500',
};

export default function ActivationsPage() {
  const [activations, setActivations] = useState<Activation[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 50, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  const fetchActivations = (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (filterStatus) params.set('status', filterStatus);
    api.get<PaginatedResponse<Activation>>(`/admin/activations?${params}`)
      .then(({ data }) => { setActivations(data.data); setMeta(data.meta); })
      .catch(() => toast.error('Failed to load activations'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchActivations(); }, [filterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const isTerminal = (status: string) => ['completed', 'expired', 'cancelled'].includes(status);

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Activations</h1>
          <p className="text-sm text-slate-500 mt-1">Track all SMS activation sessions</p>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 bg-[#111424] border border-[#1e2235] rounded-xl text-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all cursor-pointer"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s} className="bg-[#111424]">{s || 'All Statuses'}</option>
          ))}
        </select>
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
                  {['#', 'Phone', 'Service', 'Country', 'SMS Code', 'Status', 'Expires', ''].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1d2e]">
                {activations.map((a) => (
                  <tr key={a.id} className="hover:bg-[#1a1e35]/40 transition-colors group">
                    <td className="px-5 py-4 text-xs text-slate-600 font-mono">{a.id}</td>
                    <td className="px-5 py-4 text-sm font-mono text-slate-300">{a.phone_number}</td>
                    <td className="px-5 py-4 text-sm text-slate-300">{a.service?.name}</td>
                    <td className="px-5 py-4 text-sm text-slate-400">{a.country?.name}</td>
                    <td className="px-5 py-4">
                      {a.sms_code ? (
                        <span className="font-mono font-bold text-emerald-400 text-sm tracking-widest">{a.sms_code}</span>
                      ) : (
                        <span className="text-slate-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusStyles[a.status] || 'bg-slate-500/15 text-slate-400'}`}>
                        {a.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {new Date(a.expires_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-4">
                      {!isTerminal(a.status) && (
                        <button
                          onClick={() => handleExpire(a)}
                          className="text-xs text-red-400 hover:text-red-300 font-medium opacity-0 group-hover:opacity-100 transition-all"
                        >
                          Expire
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={meta.current_page} lastPage={meta.last_page} onPageChange={fetchActivations} />
        </>
      )}
    </div>
  );
}

