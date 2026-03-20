'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import useRealtimeRefresh from '@/hooks/useRealtimeRefresh';
import type { ServicePrice, PaginatedResponse } from '@/lib/types';

export default function ServicesPage() {
    const [prices, setPrices] = useState<ServicePrice[]>([]);
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 100, total: 0 });
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('All Services');
    const [selectedPrice, setSelectedPrice] = useState<ServicePrice | null>(null);
    const [activeCountriesTotal, setActiveCountriesTotal] = useState(0);

    const latestSyncTimestamp = prices
        .map((p) => p.last_seen_at || p.service?.last_synced_at || p.country?.last_synced_at)
        .filter((v): v is string => Boolean(v))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    const latestSyncLabel = latestSyncTimestamp
        ? new Date(latestSyncTimestamp).toLocaleString()
        : 'N/A';

    // Quick filters
    const quickFilters = ['All Services', 'WhatsApp', 'Telegram', 'Instagram', 'Gmail'];

    const buildParams = useCallback((page = 1) => {
        const params = new URLSearchParams({
            page: String(page),
            per_page: '100',
        });

        if (activeTab !== 'All Services') {
            params.append('search', activeTab);
        } else if (search) {
            params.append('search', search);
        }

        return params;
    }, [activeTab, search]);

    const formatMoney = (value: number | string | null | undefined) =>
        `₦${Number(value ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const formatUsd = (value: number | string | null | undefined) =>
        `$${Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const formatMarkupLabel = (price: ServicePrice) =>
        price.markup_type === 'percentage' || price.markup_type === 'percent'
            ? `${Number(price.markup_value ?? 0).toLocaleString()}%`
            : `Fixed ${formatMoney(price.markup_value ?? 0)}`;

    const loadPrices = useCallback((page = 1, silent = false) => {
        if (!silent) {
            setLoading(true);
        }

        const params = buildParams(page);

        api.get<PaginatedResponse<ServicePrice>>(`/admin/prices?${params.toString()}`)
            .then(({ data }) => { 
                setPrices(data.data); 
                setMeta(data.meta); 
            })
            .catch(() => {
                if (!silent) {
                    toast.error('Failed to load services & prices');
                }
            })
            .finally(() => {
                if (!silent) {
                    setLoading(false);
                }
            });
    }, [buildParams]);

    const loadActiveCountriesTotal = useCallback((silent = false) => {
        api
            .get<PaginatedResponse<{ id: number }>>('/admin/countries?is_active=1&per_page=1')
            .then(({ data }) => setActiveCountriesTotal(data.meta.total))
            .catch(() => {
                if (!silent) {
                    toast.error('Failed to load active countries total');
                }
            });
    }, []);

    const fetchPrices = useCallback((page = 1) => {
        loadPrices(page, false);
        loadActiveCountriesTotal(false);
    }, [loadPrices, loadActiveCountriesTotal]);

    useEffect(() => { 
        const timer = setTimeout(() => fetchPrices(1), 300);
        return () => clearTimeout(timer);
    }, [search, activeTab]); 

    useRealtimeRefresh(
        useCallback(() => {
            loadPrices(meta.current_page || 1, true);
            loadActiveCountriesTotal(true);
        }, [loadPrices, loadActiveCountriesTotal, meta.current_page]),
    );

    const handleFullSync = async () => {
        setSyncing(true);
        const toastId = toast.loading('Starting full sync... This may take a few minutes.');
        
        try {
            // Trigger the unified sync job (Product, Country, & Price)
            await api.post('/admin/prices/sync');
            
            toast.success('Sync started in background! Prices will update shortly.', { id: toastId });
            
            // Wait a bit before refreshing to show immediate progress if any
            setTimeout(() => fetchPrices(1), 2000);
        } catch (error: any) { 
            toast.error(error.response?.data?.message || 'Sync failed', { id: toastId });
        } finally { 
            setSyncing(false); 
        }
    };

    const toggleStatus = async (item: ServicePrice) => {
        const newStatus = !item.is_active;
        const updatedPrices = prices.map(p => p.id === item.id ? { ...p, is_active: newStatus } : p);
        setPrices(updatedPrices);

        try {
            await api.put(`/admin/prices/${item.id}`, { 
                markup_type: item.markup_type || 'fixed',
                markup_value: item.markup_value || 0,
                is_active: newStatus 
            });
            toast.success(newStatus ? 'Activated' : 'Disabled');
        } catch {
            setPrices(prices);
            toast.error('Failed to update status');
        }
    };

    const getServiceIcon = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('whatsapp')) return { icon: 'chat', bg: 'bg-emerald-100', text: 'text-emerald-600' };
        if (n.includes('telegram')) return { icon: 'send', bg: 'bg-blue-100', text: 'text-blue-600' };
        if (n.includes('instagram')) return { icon: 'photo_camera', bg: 'bg-pink-100', text: 'text-pink-600' };
        if (n.includes('gmail') || n.includes('google')) return { icon: 'mail', bg: 'bg-red-100', text: 'text-red-600' };
        return { icon: 'smartphone', bg: 'bg-slate-100', text: 'text-slate-600' };
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500 bg-[#f5f7f8] dark:bg-[#101822] font-display">
            {/* Top Navbar */}
            <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8">
                <div className="flex flex-1 items-center gap-4">
                    <div className="relative w-full max-w-md">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                        <input 
                            className="w-full rounded-lg border-none bg-slate-100 dark:bg-slate-800 pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0f6df0]/20" 
                            placeholder="Search services, countries, provider codes..." 
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button className="flex items-center justify-center size-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-colors">
                        <span className="material-symbols-outlined">notifications</span>
                    </button>
                    <button className="flex items-center justify-center size-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-colors">
                        <span className="material-symbols-outlined">dark_mode</span>
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Manage Services & Countries</h1>
                        <p className="mt-1 text-slate-500 dark:text-slate-400">Configure active verification services and synchronize pricing from the 5SIM provider.</p>
                    </div>
                    <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500">Auto-refresh: 15s</span>
                        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 transition-colors">
                            <span className="material-symbols-outlined text-lg">filter_list</span>
                            Filters
                        </button>
                        <button 
                            onClick={handleFullSync}
                            disabled={syncing}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0f6df0] text-white font-bold text-sm shadow-lg shadow-[#0f6df0]/20 hover:opacity-90 transition-all disabled:opacity-70"
                        >
                            <span className="material-symbols-outlined text-lg">{syncing ? 'refresh' : 'sync'}</span>
                            {syncing ? 'Syncing...' : 'Sync from 5SIM'}
                        </button>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Services</p>
                        <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{loading ? '...' : meta.total.toLocaleString()}</p>
                        <p className="text-[11px] text-slate-400 mt-1">Rows loaded per page: {meta.per_page}</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Countries</p>
                        <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{loading ? '...' : activeCountriesTotal.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Provider (5SIM) Status</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="size-2 rounded-full bg-emerald-500"></span>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">Connected</p>
                        </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Sync</p>
                        <p className="text-sm font-bold mt-1 text-slate-900 dark:text-white text-[#0f6df0] break-all">{latestSyncLabel}</p>
                    </div>
                </div>

                {/* Tabs/Quick Filters */}
                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                    {quickFilters.map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                                activeTab === tab 
                                    ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Table Card */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Service</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Country</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Provider Price (USD)</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Final Price (NGN)</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Stock</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Operators</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Markup</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Last Seen</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading && (
                                    <tr>
                                        <td colSpan={10} className="px-6 py-8 text-center text-slate-500">Loading services...</td>
                                    </tr>
                                )}
                                {!loading && prices.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="px-6 py-8 text-center text-slate-500">No services found. Try syncing.</td>
                                    </tr>
                                )}
                                {!loading && prices.map(price => {
                                    const { icon, bg, text } = getServiceIcon(price.service?.name || '');
                                    return (
                                        <tr key={price.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`size-8 rounded-lg ${bg} ${text} flex items-center justify-center`}>
                                                        <span className="material-symbols-outlined text-xl">{icon}</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-slate-900 dark:text-white block">
                                                            {price.service?.name}
                                                        </span>
                                                        <span className="text-xs text-slate-500">{price.service?.provider_service_code || '-'}</span>
                                                        <span className="text-xs text-slate-400 block">{price.service?.provider_category || '-'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {/* Flag Placeholder - replicating style */}
                                                    <div className="w-6 h-4 bg-slate-200 rounded overflow-hidden flex items-center justify-center text-[9px] font-bold text-slate-500 uppercase">
                                                         {price.country?.code}
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
                                                            {price.country?.name}
                                                        </span>
                                                        <span className="text-xs text-slate-500 block">{price.country?.provider_code || '-'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                {formatUsd(price.provider_price)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                        {formatMoney(price.final_price)}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium">ID #{price.id}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                {(price.available_count ?? 0).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                    {(price.operator_count ?? 0).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                    {formatMarkupLabel(price)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-[11px] text-slate-500">
                                                {price.last_seen_at ? new Date(price.last_seen_at).toLocaleString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <label className="relative inline-flex items-center cursor-pointer mx-auto">
                                                    <input 
                                                        type="checkbox" 
                                                        className="sr-only peer"
                                                        checked={!!price.is_active}
                                                        onChange={() => toggleStatus(price)}
                                                    />
                                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0f6df0]"></div>
                                                </label>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setSelectedPrice(price)}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-[#0f6df0]/30 hover:text-[#0f6df0] transition-colors"
                                                        title="View full pricing details"
                                                    >
                                                        <span className="material-symbols-outlined !text-base">visibility</span>
                                                        Details
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 rounded-b-xl">
                     <p className="text-xs font-medium text-slate-500">Showing <span className="text-slate-900 dark:text-white">{prices.length}</span> to <span className="text-slate-900 dark:text-white">{meta.per_page}</span> of <span className="text-slate-900 dark:text-white">{meta.total}</span> services</p>
                     <Pagination currentPage={meta.current_page} lastPage={meta.last_page} onPageChange={fetchPrices} />
                </div>

                {/* Footer Help/Notes */}
                <div className="bg-[#0f6df0]/5 border border-[#0f6df0]/10 rounded-xl p-4 flex gap-4">
                    <div className="size-10 rounded-full bg-[#0f6df0]/20 flex items-center justify-center text-[#0f6df0] shrink-0">
                        <span className="material-symbols-outlined">info</span>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Configuration Note</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            Disabling a service will immediately stop all new purchase requests for that service/country combination. This table now shows provider metadata from 5SIM including stock (`available_count`), operators, provider codes, and last-seen timestamps from the latest hourly sync.
                        </p>
                    </div>
                </div>

                {selectedPrice && (
                    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm">
                        <button className="flex-1 cursor-default" onClick={() => setSelectedPrice(null)} aria-label="Close details" />
                        <div className="h-full w-full max-w-3xl overflow-y-auto bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl p-6">
                            <div className="flex items-start justify-between gap-4 mb-6">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0f6df0]">Full Price Details</p>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                                        {selectedPrice.service?.name} / {selectedPrice.country?.name}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">Everything synced for this service-country pair.</p>
                                </div>
                                <button
                                    onClick={() => setSelectedPrice(null)}
                                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Service</p>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-2">{selectedPrice.service?.name || '-'}</p>
                                    <p className="text-sm text-slate-500 mt-1">Code: {selectedPrice.service?.provider_service_code || '-'}</p>
                                    <p className="text-sm text-slate-500">Category: {selectedPrice.service?.provider_category || '-'}</p>
                                    <p className="text-sm text-slate-500">Service synced: {selectedPrice.service?.last_synced_at ? new Date(selectedPrice.service.last_synced_at).toLocaleString() : 'N/A'}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Country</p>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-2">{selectedPrice.country?.name || '-'}</p>
                                    <p className="text-sm text-slate-500 mt-1">Code: {selectedPrice.country?.code || '-'}</p>
                                    <p className="text-sm text-slate-500">Provider code: {selectedPrice.country?.provider_code || '-'}</p>
                                    <p className="text-sm text-slate-500">Country synced: {selectedPrice.country?.last_synced_at ? new Date(selectedPrice.country.last_synced_at).toLocaleString() : 'N/A'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Provider Price (USD Raw)</p>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-2">{formatUsd(selectedPrice.provider_price)}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Final Price (NGN)</p>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-2">{formatMoney(selectedPrice.final_price)}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Stock</p>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-2">{(selectedPrice.available_count ?? 0).toLocaleString()}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Operators</p>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-2">{(selectedPrice.operator_count ?? 0).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-6">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Pricing Configuration</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600 dark:text-slate-300">
                                    <p>Markup type: <span className="font-bold">{selectedPrice.markup_type || '-'}</span></p>
                                    <p>Markup value: <span className="font-bold">{String(selectedPrice.markup_value ?? 0)}</span></p>
                                    <p>Last seen: <span className="font-bold">{selectedPrice.last_seen_at ? new Date(selectedPrice.last_seen_at).toLocaleString() : 'N/A'}</span></p>
                                </div>
                                <p className="text-xs text-slate-500 mt-3">Provider price is the raw synced provider cost shown in USD. Final price is the converted NGN selling price after exchange rate and markup.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 text-xs">
                                <div>
                                    <p className="font-semibold mb-2 text-slate-700 dark:text-slate-300">Service Payload</p>
                                    <pre className="max-h-64 overflow-auto rounded bg-slate-100 dark:bg-slate-800 p-3">{JSON.stringify(selectedPrice.service?.provider_payload ?? {}, null, 2)}</pre>
                                </div>
                                <div>
                                    <p className="font-semibold mb-2 text-slate-700 dark:text-slate-300">Country Payload</p>
                                    <pre className="max-h-64 overflow-auto rounded bg-slate-100 dark:bg-slate-800 p-3">{JSON.stringify(selectedPrice.country?.provider_payload ?? {}, null, 2)}</pre>
                                </div>
                                <div>
                                    <p className="font-semibold mb-2 text-slate-700 dark:text-slate-300">Operators Payload</p>
                                    <pre className="max-h-64 overflow-auto rounded bg-slate-100 dark:bg-slate-800 p-3">{JSON.stringify(selectedPrice.provider_payload ?? {}, null, 2)}</pre>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
