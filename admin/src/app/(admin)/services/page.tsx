'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import type { ServicePrice, PaginatedResponse } from '@/lib/types';

export default function ServicesPage() {
    const [prices, setPrices] = useState<ServicePrice[]>([]);
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 50, total: 0 });
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('All Services');

    // Quick filters
    const quickFilters = ['All Services', 'WhatsApp', 'Telegram', 'Instagram', 'Gmail'];

    const fetchPrices = (page = 1) => {
        setLoading(true);
        const params = new URLSearchParams({
            page: String(page),
        });
        
        if (activeTab !== 'All Services') {
            params.append('search', activeTab);
        } else if (search) {
             params.append('search', search);
        }

        api.get<PaginatedResponse<ServicePrice>>(`/admin/prices?${params.toString()}`)
            .then(({ data }) => { 
                setPrices(data.data); 
                setMeta(data.meta); 
            })
            .catch(() => toast.error('Failed to load services & prices'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { 
        const timer = setTimeout(() => fetchPrices(1), 300);
        return () => clearTimeout(timer);
    }, [search, activeTab]); 

    const handleFullSync = async () => {
        setSyncing(true);
        const toastId = toast.loading('Starting full sync... This may take a few minutes.');
        
        try {
            // Trigger the unified sync job (Product, Country, & Price)
            await api.post('/admin/prices/sync');
            
            toast.success('Sync started in background! Prices will update shortly.', { id: toastId });
            
            // Wait a bit before refreshing to show immediate progress if any
            setTimeout(fetchPrices, 2000);
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
                            placeholder="Search services, countries, or codes..." 
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
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                         {/* Placeholder as we don't have separate country stats endpoint yet */}
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Countries</p>
                        <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">182</p>
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
                        <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white text-[#0f6df0]">12m ago</p>
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
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Price (Stock)</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Margin %</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading services...</td>
                                    </tr>
                                )}
                                {!loading && prices.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No services found. Try syncing.</td>
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
                                                    <span className="font-semibold text-slate-900 dark:text-white">
                                                        {price.service?.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {/* Flag Placeholder - replicating style */}
                                                    <div className="w-6 h-4 bg-slate-200 rounded overflow-hidden flex items-center justify-center text-[9px] font-bold text-slate-500 uppercase">
                                                         {price.country?.code}
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                        {price.country?.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                        ₦{price.final_price?.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium">In Stock</span> {/* Stock Not available in API yet */}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <input 
                                                    className="w-16 text-center text-xs font-bold py-1 bg-slate-100 dark:bg-slate-800 border-none rounded focus:ring-1 focus:ring-[#0f6df0]/40 outline-none" 
                                                    readOnly
                                                    value={price.markup_type === 'percentage' || price.markup_type === 'percent' 
                                                        ? `${price.markup_value}%` 
                                                        : `Fixed`
                                                    }
                                                />
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
                                                <button className="text-slate-400 hover:text-[#0f6df0] transition-colors">
                                                    <span className="material-symbols-outlined">edit</span>
                                                </button>
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
                            Disabling a service will immediately stop all new purchase requests for that service/country combination. Prices are updated automatically during the daily sync, but you can manually sync specific services by using the primary action button above.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
