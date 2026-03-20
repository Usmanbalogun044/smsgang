'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import useRealtimeRefresh from '@/hooks/useRealtimeRefresh';
import type { ServicePrice, PaginatedResponse } from '@/lib/types';

interface OperatorRow {
    id: string;
    service_name: string;
    service_slug: string;
    country_name: string;
    country_code: string;
    country_flag: string;
    operator_name: string;
    cost_usd: number;
    stock_count: number;
    final_price_ngn: number;
    markup_type: string;
    markup_value: number;
}

export default function OperatorsPage() {
    const [operators, setOperators] = useState<OperatorRow[]>([]);
    const [allOperators, setAllOperators] = useState<OperatorRow[]>([]);
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 50, total: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const formatMoney = (value: number | null | undefined) =>
        `₦${Number(value ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const formatUsd = (value: number | null | undefined) =>
        `$${Number(value ?? 0).toFixed(4)}`;

    const loadOperators = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data } = await api.get<PaginatedResponse<ServicePrice>>('/admin/prices?per_page=1000');
            
            // Flatten operators from service prices
            const flattened: OperatorRow[] = [];
            (data.data || []).forEach((sp: ServicePrice) => {
                if (!sp.provider_payload || !Array.isArray(Object.keys(sp.provider_payload))) return;

                Object.entries(sp.provider_payload || {}).forEach(([opName, opInfo]: [string, any]) => {
                    if (!opInfo || typeof opInfo !== 'object') return;

                    const cost = parseFloat(opInfo.cost) || 0;
                    const count = parseInt(opInfo.count) || 0;
                    if (cost <= 0) return; // Skip invalid operators

                    flattened.push({
                        id: `${sp.service?.slug}-${sp.country?.code}-${opName}`,
                        service_name: sp.service?.name || 'Unknown',
                        service_slug: sp.service?.slug || '',
                        country_name: sp.country?.name || 'Unknown',
                        country_code: (sp.country?.code || '').toUpperCase(),
                        country_flag: sp.country?.flag || '🌍',
                        operator_name: opName,
                        cost_usd: cost,
                        stock_count: count,
                        final_price_ngn: sp.final_price || 0,
                        markup_type: sp.markup_type || 'fixed',
                        markup_value: sp.markup_value || 0,
                    });
                });
            });

            setAllOperators(flattened);
            setMeta({
                current_page: 1,
                last_page: Math.ceil(flattened.length / 50),
                per_page: 50,
                total: flattened.length,
            });
        } catch (error) {
            if (!silent) toast.error('Failed to load operators');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOperators(false);
    }, [loadOperators]);

    // Apply search filter and pagination
    useMemo(() => {
        let filtered = allOperators;
        if (search) {
            const q = search.toLowerCase();
            filtered = allOperators.filter(
                (op) =>
                    op.service_name.toLowerCase().includes(q) ||
                    op.country_name.toLowerCase().includes(q) ||
                    op.country_code.toLowerCase().includes(q) ||
                    op.operator_name.toLowerCase().includes(q),
            );
        }

        const perPage = 50;
        const start = (page - 1) * perPage;
        setOperators(filtered.slice(start, start + perPage));
        setMeta({
            ...meta,
            current_page: page,
            last_page: Math.ceil(filtered.length / perPage),
            total: filtered.length,
        });
    }, [search, page, allOperators]);

    // Realtime refresh every 15 seconds
    useRealtimeRefresh(() => loadOperators(true), { intervalMs: 15000 });

    const inStock = useMemo(() => allOperators.filter((op) => op.stock_count > 0).length, [allOperators]);
    const outOfStock = useMemo(() => allOperators.filter((op) => op.stock_count <= 0).length, [allOperators]);
    const totalOps = useMemo(() => allOperators.length, [allOperators]);

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500 bg-[#f5f7f8] dark:bg-[#101822] font-display">
            {/* Top Navbar */}
            <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8">
                <div className="flex flex-1 items-center gap-4">
                    <div className="relative w-full max-w-md">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                        <input 
                            className="w-full rounded-lg border-none bg-slate-100 dark:bg-slate-800 pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0f6df0]/20" 
                            placeholder="Search operators, services, countries..." 
                            type="text"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
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
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">All Operators</h1>
                        <p className="mt-1 text-slate-500 dark:text-slate-400">View all synced operators across services and countries with real-time pricing and stock status.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">Auto-refresh: 15s</span>
                        <button 
                            onClick={() => loadOperators(false)}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0f6df0] text-white font-bold text-sm shadow-lg shadow-[#0f6df0]/20 hover:opacity-90 transition-all disabled:opacity-70"
                        >
                            <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>refresh</span>
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">In Stock</p>
                        <p className="text-3xl font-black text-green-600 dark:text-green-400 mt-3">{inStock.toLocaleString()}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Out of Stock</p>
                        <p className="text-3xl font-black text-red-600 dark:text-red-400 mt-3">{outOfStock.toLocaleString()}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total Operators</p>
                        <p className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-3">{totalOps.toLocaleString()}</p>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex items-center justify-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 py-16">
                        <div className="text-center">
                            <span className="material-symbols-outlined animate-spin text-4xl text-[#0f6df0] mb-4">refresh</span>
                            <p className="text-slate-500 dark:text-slate-400">Loading operators...</p>
                        </div>
                    </div>
                ) : operators.length === 0 ? (
                    <div className="flex items-center justify-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 py-16">
                        <div className="text-center">
                            <p className="text-slate-500 dark:text-slate-400 text-lg">No operators found</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                        <th className="text-left px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Service</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Country</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Operator</th>
                                        <th className="text-right px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Cost USD</th>
                                        <th className="text-right px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Stock</th>
                                        <th className="text-right px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Price NGN</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {operators.map((op) => (
                                        <tr key={op.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{op.service_name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{op.service_slug}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{op.country_flag}</span>
                                                    <div>
                                                        <p className="font-semibold text-slate-900 dark:text-white text-sm">{op.country_name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{op.country_code}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold">
                                                    {op.operator_name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{formatUsd(op.cost_usd)}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${op.stock_count > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                                                    {op.stock_count}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">{formatMoney(op.final_price_ngn)}</p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex justify-center">
                            <Pagination currentPage={meta.current_page} lastPage={meta.last_page} onPageChange={setPage} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
