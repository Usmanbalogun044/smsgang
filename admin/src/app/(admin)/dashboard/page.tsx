'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { AdminStats } from '@/lib/types';
import { useAuthStore } from '@/store/auth';

export default function DashboardPage() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuthStore();

    useEffect(() => {
        api.get('/admin/stats')
            .then(({ data }) => setStats(data.data))
            .catch(() => toast.error('Failed to load stats'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500">
            {/* Top Bar / Header Component Integration */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm transition-colors">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary rotate-3 transition-transform hover:rotate-0">
                        <span className="material-symbols-outlined !text-2xl font-bold">dashboard</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Admin Dashboard</h1>
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Platform performance & health</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden lg:flex relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 !text-lg">search</span>
                        <input 
                            type="text" 
                            placeholder="Search records..." 
                            className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl pl-10 pr-4 py-2 text-sm w-64 focus:ring-2 focus:ring-primary/20 text-slate-600 dark:text-slate-300 placeholder:text-slate-400 transition-all font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">System Live</span>
                    </div>
                    <button className="relative w-10 h-10 flex border border-slate-200 dark:border-slate-800 items-center justify-center rounded-xl bg-white dark:bg-slate-900 text-slate-500 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">notifications</span>
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                    </button>
                </div>
            </div>

            {/* Viewport Content */}
            <div className="p-8 space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Revenue</span>
                            <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">+12.5%</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{stats?.total_revenue?.toLocaleString() || '0'}</span>
                            <span className="text-slate-400 text-[11px] mt-1 font-semibold uppercase tracking-wider">30 days aggregate</span>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Active Activations</span>
                            <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">+5.2%</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{stats?.active_activations?.toLocaleString() || '0'}</span>
                            <span className="text-slate-400 text-[11px] mt-1 font-semibold uppercase tracking-wider">currently active</span>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Users</span>
                            <span className="text-blue-500 text-xs font-bold bg-blue-500/10 px-2 py-1 rounded-lg">+3.1%</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{stats?.registered_users?.toLocaleString() || '0'}</span>
                            <span className="text-slate-400 text-[11px] mt-1 font-semibold uppercase tracking-wider">registered users</span>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Today's Sales</span>
                            <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">+8.4%</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{stats?.revenue_today?.toLocaleString() || '0'}</span>
                            <span className="text-slate-400 text-[11px] mt-1 font-semibold uppercase tracking-wider">since midnight</span>
                        </div>
                    </div>
                </div>

                {/* Main Layout Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Revenue Chart Area */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Revenue Performance</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Monthly revenue trend analysis</p>
                            </div>
                            <select className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-xs font-bold px-3 py-2 focus:ring-primary text-slate-600 dark:text-slate-300">
                                <option>Last 30 Days</option>
                                <option>Last 7 Days</option>
                                <option>Last Year</option>
                            </select>
                        </div>
                        <div className="h-[300px] w-full relative group">
                            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 300">
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="#0f6df0" stopOpacity="0.2"></stop>
                                        <stop offset="100%" stopColor="#0f6df0" stopOpacity="0"></stop>
                                    </linearGradient>
                                </defs>
                                <path d="M0,250 C100,240 150,220 200,180 C250,140 300,120 400,150 C500,180 600,80 700,50 L800,20 L800,300 L0,300 Z" fill="url(#chartGradient)"></path>
                                <path d="M0,250 C100,240 150,220 200,180 C250,140 300,120 400,150 C500,180 600,80 700,50 L800,20" fill="none" stroke="#0f6df0" strokeLinecap="round" strokeWidth="4"></path>
                                <line className="text-slate-100 dark:text-slate-800" stroke="currentColor" strokeDasharray="4" x1="0" x2="800" y1="50" y2="50"></line>
                                <line className="text-slate-100 dark:text-slate-800" stroke="currentColor" strokeDasharray="4" x1="0" x2="800" y1="150" y2="150"></line>
                                <line className="text-slate-100 dark:text-slate-800" stroke="currentColor" strokeDasharray="4" x1="0" x2="800" y1="250" y2="250"></line>
                            </svg>
                            <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <span>May 01</span>
                                <span>May 10</span>
                                <span>May 20</span>
                                <span>Jun 01</span>
                            </div>
                        </div>
                    </div>

                    {/* Market Distribution */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Markets</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Distribution by volume</p>
                            </div>
                            <span className="material-symbols-outlined text-slate-300">public</span>
                        </div>
                        <div className="flex-1 space-y-6">
                            {[
                                { name: 'Nigeria', val: 64, color: 'bg-primary' },
                                { name: 'Ghana', val: 18, color: 'bg-primary/80' },
                                { name: 'Kenya', val: 12, color: 'bg-primary/50' },
                                { name: 'Others', val: 6, color: 'bg-primary/20' }
                            ].map((market) => (
                                <div key={market.name} className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                                        <span className="text-slate-500 dark:text-slate-400">{market.name}</span>
                                        <span className="text-slate-900 dark:text-white">{market.val}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                                        <div className={`${market.color} h-full transition-all duration-1000`} style={{ width: `${market.val}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="mt-8 w-full py-3.5 border-2 border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold text-primary hover:bg-primary hover:text-white hover:border-primary transition-all duration-300">
                            Download Analytics
                        </button>
                    </div>
                </div>

                {/* System Activity Table */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Real-Time Logs</h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Automated monitoring system updates</p>
                        </div>
                        <button className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all shadow-sm">
                            Clear Logs
                        </button>
                    </div>
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-800">
                            <span className="material-symbols-outlined text-3xl opacity-20 text-slate-900 dark:text-white">list_alt</span>
                        </div>
                        <h4 className="text-slate-900 dark:text-white font-bold mb-1">Waiting for data...</h4>
                        <p className="text-slate-500 text-sm max-w-xs mx-auto">System events and user activity logs will sync automatically when active.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
