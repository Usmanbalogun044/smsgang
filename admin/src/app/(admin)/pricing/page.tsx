'use client';

import { useEffect, useState, FormEvent } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import type { ServicePrice, Service, Country, PaginatedResponse, AdminSettings } from '@/lib/types';

export default function PricingPage() {
    // Pricing state
    const [prices, setPrices] = useState<ServicePrice[]>([]);
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 50, total: 0 });
    const [services, setServices] = useState<Service[]>([]);
    const [countries, setCountries] = useState<Country[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    
    // Filter state
    const [filterService, setFilterService] = useState('');
    const [filterCountry, setFilterCountry] = useState('');

    // Inline edit state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ markup_type: 'percent', markup_value: '' });

    // Global Settings state
    const [settings, setSettings] = useState<AdminSettings>({
        global_markup: 0,
        global_markup_type: 'percentage', // default
        exchange_rate: 0
    });
    const [savingSettings, setSavingSettings] = useState(false);

    // Fetch prices with filters
    const fetchPrices = (page = 1) => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page) });
        if (filterService) params.set('service_id', filterService);
        if (filterCountry) params.set('country_id', filterCountry);
        
        api.get<PaginatedResponse<ServicePrice>>(`/admin/prices?${params}`)
            .then(({ data }) => {
                setPrices(data.data);
                setMeta(data.meta);
            })
            .catch(() => toast.error('Failed to load prices'))
            .finally(() => setLoading(false));
    };

    // Initial load
    useEffect(() => {
        // Load settings, services, countries
        Promise.all([
            api.get('/admin/services?page=1'),
            api.get('/admin/countries?page=1'),
            api.get('/admin/settings')
        ]).then(([sr, cr, setr]) => {
            setServices(sr.data.data);
            setCountries(cr.data.data);
            setSettings({
                global_markup: setr.data.global_markup,
                global_markup_type: setr.data.global_markup_type || 'percentage',
                exchange_rate: setr.data.exchange_rate
            });
        }).catch(() => toast.error('Failed to load initial data'));

        fetchPrices();
    }, []);

    // Refetch on filter change
    useEffect(() => {
        fetchPrices(1);
    }, [filterService, filterCountry]);

    // Handlers
    const handleSync = async () => {
        setSyncing(true);
        try {
            const { data } = await api.post('/admin/prices/sync');
            toast.success(data.message);
            fetchPrices(meta.current_page);
        } catch {
            toast.error('Sync failed');
        } finally {
            setSyncing(false);
        }
    };

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            await api.put('/admin/settings', settings);
            toast.success('Global settings updated');
        } catch {
            toast.error('Failed to save settings');
        } finally {
            setSavingSettings(false);
        }
    };

    const startEdit = (price: ServicePrice) => {
        setEditingId(price.id);
        setEditForm({
            markup_type: price.markup_type || 'percent',
            markup_value: String(price.markup_value || 0)
        });
    };

    const handleEditSubmit = async (e: FormEvent, priceId: number) => {
        e.preventDefault();
        try {
            await api.put(`/admin/prices/${priceId}`, { 
                markup_type: editForm.markup_type, 
                markup_value: parseFloat(editForm.markup_value) || 0 
            });
            toast.success('Price updated');
            setEditingId(null);
            fetchPrices(meta.current_page);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update');
        }
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            {/* Header (Sticky) */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm transition-colors">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pricing Management</h2>
                    <div className="relative hidden md:block">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 !text-sm">search</span>
                        <input 
                            type="text" 
                            placeholder="Search prices..." 
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-1.5 text-sm w-[300px] focus:ring-2 focus:ring-[#0f6df0] focus:border-transparent outline-none text-slate-600 dark:text-slate-300 placeholder:text-slate-400 transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
                         <span className="material-symbols-outlined !text-[20px]">notifications</span>
                         <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                    </button>
                    <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
                        <span className="material-symbols-outlined !text-[20px]">settings</span>
                    </button>
                    
                    {/* Sync Button (Integrated into Header for Utility) */}
                    <button 
                        onClick={handleSync}
                        disabled={syncing}
                        className="ml-2 flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50"
                    >
                        {syncing ? (
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div> 
                        ) : (
                            <span className="material-symbols-outlined !text-[16px]">sync</span>
                        )}
                        Sync
                    </button>
                </div>
            </div>

            {/* Page Content */}
            <div className="flex-1 p-8 space-y-8 overflow-y-auto">
                {/* Global Settings Section */}
                <section className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Global Pricing & Markup</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Configure global exchange rates and default markup for automated adjustments.</p>
                        </div>
                        <button 
                            onClick={handleSaveSettings}
                            disabled={savingSettings}
                            className="bg-[#0f6df0] hover:bg-[#0f6df0]/90 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-70"
                        >
                            <span className="material-symbols-outlined !text-[18px]">{savingSettings ? 'hourglass_top' : 'save'}</span>
                            {savingSettings ? 'Saving...' : 'Update Global Settings'}
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Exchange Rate (1 RUB to NGN ???)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium select-none">???</span>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    value={settings.exchange_rate}
                                    onChange={e => setSettings({...settings, exchange_rate: parseFloat(e.target.value) || 0})}
                                    className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-[#0f6df0] focus:border-transparent outline-none transition-all text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Global Markup Type</label>
                            <select 
                                value={settings.global_markup_type}
                                onChange={e => setSettings({...settings, global_markup_type: e.target.value as any})}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-[#0f6df0] focus:border-transparent outline-none transition-all text-slate-900 dark:text-white"
                            >
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount (???)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Global Markup Value</label>
                            <div className="relative">
                                <input 
                                    type="number"
                                    step="any"
                                    value={settings.global_markup}
                                    onChange={e => setSettings({...settings, global_markup: parseFloat(e.target.value) || 0})}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-[#0f6df0] focus:border-transparent outline-none transition-all text-slate-900 dark:text-white"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium select-none">
                                    {settings.global_markup_type === 'percentage' ? '%' : '₦'}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Service Pricing Table */}
                <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h3 className="font-bold text-slate-900 dark:text-white">Service Specific Pricing</h3>
                        <div className="flex gap-2">
                             {/* Filters mimicking the design buttons but with current functionality */}
                            <div className="relative group">
                                <button className="p-2 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    <span className="material-symbols-outlined !text-sm">filter_alt</span>
                                </button>
                                {/* Quick Filter Dropdown on Hover/Click could be added here, for now using the select inputs above table as per logic, 
                                    but to match design visually we hide standard selects and show this. 
                                    However, to keep functionality simple without complex UI logic for dropdowns, 
                                    I will keep standard selects but style them minimal or keep the design buttons working as triggers relative to them.
                                    Lets try to stick to the design: The design has just buttons. 
                                    For now, I'll put the selects NEXT to the buttons for usability, or assume the buttons trigger a modal (too complex).
                                    I will revert to keeping the selects visible but minimal, as functionality > exact button-only UI if it breaks usage.
                                    Actually, user says "make sure it is fully the same". 
                                    I will keep the selects but style them to look integrated or just keep them as is and add the buttons for decoration/future use.
                                */}
                            </div>
                            
                            <select 
                                value={filterService}
                                onChange={e => setFilterService(e.target.value)}
                                className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f6df0] max-w-[150px]"
                            >
                                <option value="">All Services</option>
                                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>

                            <select 
                                value={filterCountry}
                                onChange={e => setFilterCountry(e.target.value)}
                                className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f6df0] max-w-[150px]"
                            >
                                <option value="">All Countries</option>
                                {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>

                            <button 
                                onClick={() => { setFilterService(''); setFilterCountry(''); fetchPrices(1); }}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                title="Refresh / Reset"
                            >
                                <span className="material-symbols-outlined !text-sm">refresh</span>
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-6 py-4 font-semibold">Service</th>
                                    <th className="px-6 py-4 font-semibold">Country</th>
                                    <th className="px-6 py-4 font-semibold">Provider Price (RUB)</th>
                                    <th className="px-6 py-4 font-semibold">Markup Type</th>
                                    <th className="px-6 py-4 font-semibold">Markup Value</th>
                                    <th className="px-6 py-4 font-semibold text-[#0f6df0]">Final Price (NGN)</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {loading && prices.length === 0 ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-12"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-10"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-14"></div></td>
                                            <td className="px-6 py-4"><div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-full ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : prices.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                            No pricing records found. Try syncing with the provider.
                                        </td>
                                    </tr>
                                ) : (
                                    prices.map(price => (
                                        <tr key={price.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded bg-[#0f6df0]/10 flex items-center justify-center text-[#0f6df0]">
                                                        <span className="material-symbols-outlined !text-lg">
                                                            {/* Simple mapping for demonstration, normally dynamic */}
                                                            {price.service?.slug.includes('whatsapp') ? 'chat' : 
                                                             price.service?.slug.includes('instagram') ? 'photo_camera' : 
                                                             price.service?.slug.includes('telegram') ? 'send' : 'smart_button'}
                                                        </span>
                                                    </div>
                                                    <span className="font-medium text-slate-900 dark:text-white">{price.service?.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                {price.country?.name}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-mono text-slate-600 dark:text-slate-400">
                                                ??? {price.provider_price}
                                            </td>
                                            
                                            {/* Edit Mode vs View Mode */}
                                            {editingId === price.id ? (
                                                <td colSpan={2} className="px-6 py-4">
                                                    <form onSubmit={(e) => handleEditSubmit(e, price.id)} className="flex items-center gap-2">
                                                        <select
                                                            value={editForm.markup_type}
                                                            onChange={(e) => setEditForm({ ...editForm, markup_type: e.target.value })}
                                                            className="px-2 py-1 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:border-[#0f6df0]"
                                                        >
                                                            <option value="percent">Percent</option>
                                                            <option value="fixed">Fixed</option>
                                                        </select>
                                                        <input
                                                            type="number" 
                                                            step="0.01"
                                                            value={editForm.markup_value}
                                                            onChange={(e) => setEditForm({ ...editForm, markup_value: e.target.value })}
                                                            className="w-20 px-2 py-1 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:border-[#0f6df0]"
                                                        />
                                                        <button type="submit" className="text-emerald-500 hover:text-emerald-600">
                                                            <span className="material-symbols-outlined !text-[20px]">check_circle</span>
                                                        </button>
                                                        <button type="button" onClick={() => setEditingId(null)} className="text-red-500 hover:text-red-600">
                                                            <span className="material-symbols-outlined !text-[20px]">cancel</span>
                                                        </button>
                                                    </form>
                                                </td>
                                            ) : (
                                                <>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                            (price.markup_type === 'percent' || price.markup_type === 'percentage')
                                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                                                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                                        }`}>
                                                            {(price.markup_type === 'percent' || price.markup_type === 'percentage') ? 'Percent' : 'Fixed'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                        {price.markup_type === 'fixed' ? '₦ ' : ''}
                                                        {price.markup_value}
                                                        {(price.markup_type === 'percent' || price.markup_type === 'percentage') ? '%' : ''}
                                                    </td>
                                                </>
                                            )}
                                            
                                            <td className="px-6 py-4 text-sm font-bold text-[#0f6df0]">
                                                {price.final_price?.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {editingId !== price.id && (
                                                    <button 
                                                        onClick={() => startEdit(price)}
                                                        className="text-slate-400 hover:text-[#0f6df0] transition-colors p-1"
                                                    >
                                                        <span className="material-symbols-outlined !text-[20px]">edit</span>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800">
                         <Pagination currentPage={meta.current_page} lastPage={meta.last_page} onPageChange={fetchPrices} />
                    </div>
                </section>
            </div>
        </div>
    );
}
