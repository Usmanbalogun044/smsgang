'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import useRealtimeRefresh from '@/hooks/useRealtimeRefresh';
import type { SmmServicePrice, PaginatedResponse } from '@/lib/types';

export default function AdminSmmServicesPage() {
  const [services, setServices] = useState<SmmServicePrice[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 50, total: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(1);

  const formatMoney = (value: number) =>
    `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatUsd = (value: number) =>
    `$${Number(value).toFixed(2)}`;

  const loadServices = useCallback((currentPage = 1, silent = false) => {
    if (!silent) setLoading(true);

    api
      .get<PaginatedResponse<SmmServicePrice>>(`/admin/smm/services?page=${currentPage}&per_page=50`)
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

  const handleToggleStatus = async (service: SmmServicePrice) => {
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
            <p className="text-slate-600 dark:text-slate-400 mt-2">Manage CrestPanel SMM services and pricing</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Service Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Quantity Range</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Rate (NGN)</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Final Price (NGN)</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Markup</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {services.map((service) => (
                    <tr key={service.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white line-clamp-1">
                        {service.smm_service?.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {service.smm_service?.min} - {service.smm_service?.max}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                        {formatMoney(service.smm_service?.rate || 0)}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-blue-600">
                        {formatMoney(service.final_price)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {service.markup_type === 'Fixed' ? `Fixed ${formatMoney(service.markup_value)}` : `${service.markup_value}%`}
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
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(service)}
                          className="text-sm text-blue-600 hover:underline font-semibold"
                        >
                          {service.is_active ? 'Disable' : 'Enable'}
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
