'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import useRealtimeRefresh from '@/hooks/useRealtimeRefresh';
import type { Country, PaginatedResponse } from '@/lib/types';

export default function CountriesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 100, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  const buildParams = useCallback(
    (page = 1) => {
      const params = new URLSearchParams({
        page: String(page),
        per_page: '100',
      });

      if (search.trim()) {
        params.set('search', search.trim());
      }

      if (showActiveOnly) {
        params.set('is_active', '1');
      }

      return params;
    },
    [search, showActiveOnly],
  );

  const loadCountries = useCallback(
    (page = 1, silent = false) => {
      if (!silent) {
        setLoading(true);
      }

      api
        .get<PaginatedResponse<Country>>(`/admin/countries?${buildParams(page).toString()}`)
        .then(({ data }) => {
          setCountries(data.data);
          setMeta(data.meta);
        })
        .catch(() => {
          if (!silent) {
            toast.error('Failed to load countries');
          }
        })
        .finally(() => {
          if (!silent) {
            setLoading(false);
          }
        });
    },
    [buildParams],
  );

  const fetchCountries = useCallback(
    (page = 1) => {
      loadCountries(page, false);
    },
    [loadCountries],
  );

  useEffect(() => {
    const timer = setTimeout(() => fetchCountries(1), 250);
    return () => clearTimeout(timer);
  }, [fetchCountries, search, showActiveOnly]);

  useRealtimeRefresh(
    useCallback(() => {
      loadCountries(meta.current_page || 1, true);
    }, [loadCountries, meta.current_page]),
  );

  const totals = useMemo(() => {
    const active = countries.filter((country) => country.is_active).length;
    const inactive = countries.length - active;

    return { active, inactive };
  }, [countries]);

  const toggleCountry = async (country: Country) => {
    const previous = countries;
    setCountries((current) =>
      current.map((item) => (item.id === country.id ? { ...item, is_active: !item.is_active } : item)),
    );

    try {
      await api.post(`/admin/countries/${country.id}/toggle`);
      toast.success(country.is_active ? 'Country disabled' : 'Country enabled');
    } catch {
      setCountries(previous);
      toast.error('Failed to update country status');
    }
  };

  const lastSync = countries
    .map((country) => country.last_synced_at)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  const formatKeys = (value: Record<string, unknown> | Record<string, number> | null | undefined) => {
    if (!value) return '-';

    const keys = Object.keys(value);
    return keys.length > 0 ? keys.join(', ') : '-';
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 bg-[#f5f7f8] dark:bg-[#101822] font-display">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input
              className="w-full rounded-lg border-none bg-slate-100 dark:bg-slate-800 pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0f6df0]/20"
              placeholder="Search country, code, provider code..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Auto-refresh: 15s</span>
          <button
            onClick={() => setShowActiveOnly((v) => !v)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              showActiveOnly
                ? 'bg-[#0f6df0]/10 text-[#0f6df0] border-[#0f6df0]/30'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {showActiveOnly ? 'Showing Active Only' : 'Show Active Only'}
          </button>
          <button
            onClick={() => fetchCountries(1)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0f6df0] text-white font-bold text-sm shadow-lg shadow-[#0f6df0]/20 hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            Refresh
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Manage Countries</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">All synced country metadata, provider codes, capabilities, and live activation state.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Countries</p>
            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{meta.total.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active (This Page)</p>
            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{totals.active.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inactive (This Page)</p>
            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{totals.inactive.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Sync Seen</p>
            <p className="text-sm font-bold mt-1 text-[#0f6df0] break-all">{lastSync ? new Date(lastSync).toLocaleString() : 'N/A'}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Country</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Provider</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Capabilities</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Linked Services</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Synced</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">Loading countries...</td>
                  </tr>
                )}
                {!loading && countries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">No countries found.</td>
                  </tr>
                )}
                {!loading && countries.map((country) => (
                  <tr key={country.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300">
                          {country.code}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{country.name}</p>
                          <p className="text-xs text-slate-500">{country.provider_name_ru || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{country.provider_code || '-'}</p>
                      <p className="text-xs text-slate-500">ISO: {formatKeys(country.provider_iso)}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      <p>Prefix: {formatKeys(country.provider_prefix)}</p>
                      <p className="text-xs text-slate-500 mt-1">Capabilities: {formatKeys(country.provider_capabilities)}</p>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {(country.service_prices_count ?? 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-slate-600 dark:text-slate-300">
                      {country.last_synced_at ? new Date(country.last_synced_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <label className="relative inline-flex items-center cursor-pointer mx-auto">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={!!country.is_active}
                          onChange={() => toggleCountry(country)}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0f6df0]"></div>
                      </label>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedCountry(country)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-[#0f6df0]/30 hover:text-[#0f6df0] transition-colors"
                        title="View full country details"
                      >
                        <span className="material-symbols-outlined !text-base">visibility</span>
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 rounded-b-xl">
          <p className="text-xs font-medium text-slate-500">
            Showing <span className="text-slate-900 dark:text-white">{countries.length}</span> of{' '}
            <span className="text-slate-900 dark:text-white">{meta.total}</span> countries
          </p>
          <Pagination currentPage={meta.current_page} lastPage={meta.last_page} onPageChange={fetchCountries} />
        </div>

        {selectedCountry && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm">
            <button className="flex-1 cursor-default" onClick={() => setSelectedCountry(null)} aria-label="Close details" />
            <div className="h-full w-full max-w-2xl overflow-y-auto bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0f6df0]">Country Details</p>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">{selectedCountry.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">All synced metadata for this country.</p>
                </div>
                <button
                  onClick={() => setSelectedCountry(null)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Identity</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-2">{selectedCountry.name}</p>
                  <p className="text-sm text-slate-500 mt-1">Code: {selectedCountry.code || '-'}</p>
                  <p className="text-sm text-slate-500">Provider code: {selectedCountry.provider_code || '-'}</p>
                  <p className="text-sm text-slate-500">Russian name: {selectedCountry.provider_name_ru || '-'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Sync</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-2">{selectedCountry.last_synced_at ? new Date(selectedCountry.last_synced_at).toLocaleString() : 'N/A'}</p>
                  <p className="text-sm text-slate-500 mt-1">Linked services: {(selectedCountry.service_prices_count ?? 0).toLocaleString()}</p>
                  <p className="text-sm text-slate-500">Status: {selectedCountry.is_active ? 'Active' : 'Disabled'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-6 text-sm">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">ISO Keys</p>
                  <p className="font-semibold text-slate-900 dark:text-white mt-2">{formatKeys(selectedCountry.provider_iso)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Prefix Keys</p>
                  <p className="font-semibold text-slate-900 dark:text-white mt-2">{formatKeys(selectedCountry.provider_prefix)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Capabilities</p>
                  <p className="font-semibold text-slate-900 dark:text-white mt-2">{formatKeys(selectedCountry.provider_capabilities)}</p>
                </div>
              </div>

              <div>
                <p className="font-semibold mb-2 text-slate-700 dark:text-slate-300">Raw Country Payload</p>
                <pre className="max-h-96 overflow-auto rounded bg-slate-100 dark:bg-slate-800 p-3 text-xs">
                  {JSON.stringify(selectedCountry.provider_payload ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
