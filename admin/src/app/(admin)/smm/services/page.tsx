'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import useRealtimeRefresh from '@/hooks/useRealtimeRefresh';
import type { SmmServicePrice, PaginatedResponse } from '@/lib/types';

interface DetailedSmmService extends SmmServicePrice {
  crestpanel_service_id?: string | number;
  last_synced_at?: string;
  created_at?: string;
  updated_at?: string;
  provider_payload?: any;
  smm_service?: {
    id?: number;
    name?: string;
    category?: string;
    type?: string;
    rate?: string | number;
    min?: number;
    max?: number;
    refill?: boolean;
    cancel?: boolean;
  };
}

export default function AdminSmmServicesPage() {
  const [services, setServices] = useState<DetailedSmmService[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 50, total: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const formatMoney = (value: number) =>
    `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const loadServices = useCallback((currentPage = 1, silent = false) => {
    if (!silent) setLoading(true);

    api
      .get<PaginatedResponse<DetailedSmmService>>(`/admin/smm/services?page=${currentPage}&per_page=50`)
      .then(({ data }) => {
        setServices(data.data);
        setMeta(data.meta);
      })
      .catch(() => {
        if (!silent) toast.error('Failed to load services');
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadServices(1);
  }, []);

  useRealtimeRefresh(
    useCallback(() => {
      loadServices(page, true);
    }, [loadServices, page]),
    { intervalMs: 3600000 }
  );

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/admin/smm/services/sync');
      toast.success('Sync started!');
      setTimeout(() => loadServices(1), 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleStatus = async (service: DetailedSmmService) => {
    try {
      await api.put(`/admin/smm/services/${service.id}`, {
        is_active: !service.is_active,
      });
      toast.success(`Service ${!service.is_active ? 'activated' : 'deactivated'}`);
      loadServices(page);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update service');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">SMM Services Management</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Manage CrestPanel SMM services, pricing, and complete details</p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined">{syncing ? 'refresh' : 'sync'}</span>
            {syncing ? 'Syncing...' : 'Sync Services'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400 text-sm">Total Services</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{meta.total.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400 text-sm">Active</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{services.filter(s => s.is_active).length.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400 text-sm">Inactive</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{services.filter(s => !s.is_active).length.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400 text-sm">Page</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{meta.current_page} / {meta.last_page}</p>
          </div>
        </div>

        {/* Services Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading services...</div>
          ) : services.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No services found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest w-10">Open</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest min-w-[280px]">Service Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Rate (per 1k)</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Selling (per 1k)</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Markup</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Min-Max</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {services.map((service) => (
                    <Fragment key={service.id}>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                          onClick={() => setExpandedId(expandedId === service.id ? null : service.id)}>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-block transform transition-transform ${expandedId === service.id ? 'rotate-90' : ''}`}>
                            ▸
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                          {service.smm_service?.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {service.smm_service?.category || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {service.smm_service?.type || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                          {formatMoney(service.smm_service?.rate as any || 0)}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-blue-600">
                          {formatMoney((service.final_price || 0) * 1000)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {service.markup_type === 'Fixed' ? `Fixed ${formatMoney(service.markup_value as any)}` : `${service.markup_value}%`}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {service.smm_service?.min}-{service.smm_service?.max}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            service.is_active 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {service.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                      {expandedId === service.id && (
                        <tr className="bg-slate-100 dark:bg-slate-700/30">
                          <td colSpan={9} className="px-6 py-6">
                            <div className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* CrestPanel Service ID */}
                                <div>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">CrestPanel ID</p>
                                  <p className="text-sm font-mono text-slate-900 dark:text-white mt-1">{service.crestpanel_service_id || '—'}</p>
                                </div>
                                
                                {/* Flags */}
                                <div>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Services</p>
                                  <p className="text-sm text-slate-900 dark:text-white mt-1">
                                    Refill: {service.smm_service?.refill ? '✓' : '✗'} | Cancel: {service.smm_service?.cancel ? '✓' : '✗'}
                                  </p>
                                </div>

                                {/* Last Synced */}
                                <div>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Last Synced</p>
                                  <p className="text-sm text-slate-900 dark:text-white mt-1">
                                    {service.last_synced_at ? new Date(service.last_synced_at).toLocaleString() : '—'}
                                  </p>
                                </div>

                                {/* Created At */}
                                <div>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Created</p>
                                  <p className="text-sm text-slate-900 dark:text-white mt-1">
                                    {service.created_at ? new Date(service.created_at).toLocaleString() : '—'}
                                  </p>
                                </div>

                                {/* Updated At */}
                                <div>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Updated</p>
                                  <p className="text-sm text-slate-900 dark:text-white mt-1">
                                    {service.updated_at ? new Date(service.updated_at).toLocaleString() : '—'}
                                  </p>
                                </div>

                                {/* Markup Details */}
                                <div>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Markup Details</p>
                                  <p className="text-sm text-slate-900 dark:text-white mt-1">
                                    Type: {service.markup_type} | Value: {service.markup_value}
                                  </p>
                                </div>
                              </div>

                              {/* Provider Payload */}
                              {service.provider_payload && (
                                <div>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">Provider Payload</p>
                                  <pre className="bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto max-h-64">
                                    {JSON.stringify(service.provider_payload, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-600">
                                <button
                                  onClick={() => handleToggleStatus(service)}
                                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                                    service.is_active
                                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                                  }`}
                                >
                                  {service.is_active ? 'Disable' : 'Enable'}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
                loadServices(p);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
