'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { AdminStats, Withdrawal } from '@/lib/types';

export default function DashboardPage() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [withdrawalTotal, setWithdrawalTotal] = useState(0);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawNote, setWithdrawNote] = useState('');
    const [withdrawing, setWithdrawing] = useState(false);

    const loadStats = () =>
        api.get('/admin/stats')
            .then(({ data }) => setStats(data.data))
            .catch(() => toast.error('Failed to load stats'));

    const loadWithdrawals = () =>
        api.get('/admin/withdrawals')
            .then(({ data }) => {
                setWithdrawals(data.data);
                setWithdrawalTotal(data.total);
            })
            .catch(() => toast.error('Failed to load withdrawals'));

    useEffect(() => {
        Promise.all([loadStats(), loadWithdrawals()]).finally(() => setLoading(false));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(withdrawAmount);
        if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
        setWithdrawing(true);
        try {
            await api.post('/admin/withdrawals', { amount: amt, note: withdrawNote || null });
            toast.success('Withdrawal recorded');
            setWithdrawAmount('');
            setWithdrawNote('');
            await Promise.all([loadStats(), loadWithdrawals()]);
        } catch {
            toast.error('Failed to record withdrawal');
        } finally {
            setWithdrawing(false);
        }
    };

    const handleDeleteWithdrawal = async (id: number) => {
        if (!confirm('Delete this withdrawal record?')) return;
        try {
            await api.delete(`/admin/withdrawals/${id}`);
            toast.success('Withdrawal deleted');
            await Promise.all([loadStats(), loadWithdrawals()]);
        } catch {
            toast.error('Failed to delete');
        }
    };

    const availableBalance = (stats?.total_profit ?? 0) - withdrawalTotal;
    const fmt = (n: number) => n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-[#0f6df0] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm transition-colors">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#0f6df0]/10 rounded-xl flex items-center justify-center text-[#0f6df0]">
                        <span className="material-symbols-outlined !text-2xl font-bold">dashboard</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Admin Dashboard</h1>
                        <p className="text-xs font-semibold text-slate-400">Platform performance & health</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">System Live</span>
                    </div>
                </div>
            </div>

            <div className="p-8 space-y-8">
                {/* Top Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-[#0f6df0]/20 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Sales (NGN)</span>
                            <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">{stats?.completed_sales_count?.toLocaleString() ?? '0'} sales</span>
                        </div>
                        <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">₦{fmt(stats?.total_revenue ?? 0)}</span>
                        <p className="text-slate-400 text-[11px] mt-1 font-semibold uppercase tracking-wider">completed orders</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-[#0f6df0]/20 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Profit (NGN)</span>
                            <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">all-time</span>
                        </div>
                        <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">₦{fmt(stats?.total_profit ?? 0)}</span>
                        <p className="text-slate-400 text-[11px] mt-1 font-semibold uppercase tracking-wider">gross profit earned</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-[#0f6df0]/20 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Users</span>
                            <span className="text-[#0f6df0] text-xs font-bold bg-[#0f6df0]/10 px-2 py-1 rounded-lg">registered</span>
                        </div>
                        <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{stats?.registered_users?.toLocaleString() ?? '0'}</span>
                        <p className="text-slate-400 text-[11px] mt-1 font-semibold uppercase tracking-wider">total accounts</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-[#0f6df0]/20 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Active Now</span>
                            <span className="text-amber-500 text-xs font-bold bg-amber-500/10 px-2 py-1 rounded-lg">live</span>
                        </div>
                        <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{stats?.active_activations?.toLocaleString() ?? '0'}</span>
                        <p className="text-slate-400 text-[11px] mt-1 font-semibold uppercase tracking-wider">active activations</p>
                    </div>
                </div>

                {/* Profit Breakdown */}
                <div>
                    <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-widest text-xs">Profit Breakdown</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Today */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Today</span>
                                <div className="w-8 h-8 bg-[#0f6df0]/10 rounded-lg flex items-center justify-center">
                                    <span className="material-symbols-outlined !text-base text-[#0f6df0]">today</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500">Revenue</span>
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">₦{fmt(stats?.revenue_today ?? 0)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500">Profit</span>
                                    <span className="text-sm font-bold text-emerald-600">₦{fmt(stats?.profit_today ?? 0)}</span>
                                </div>
                            </div>
                        </div>
                        {/* This Week */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">This Week</span>
                                <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
                                    <span className="material-symbols-outlined !text-base text-amber-600">date_range</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500">Revenue</span>
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">₦{fmt(stats?.revenue_week ?? 0)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500">Profit</span>
                                    <span className="text-sm font-bold text-emerald-600">₦{fmt(stats?.profit_week ?? 0)}</span>
                                </div>
                            </div>
                        </div>
                        {/* This Month */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">This Month</span>
                                <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                                    <span className="material-symbols-outlined !text-base text-purple-600">calendar_month</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500">Revenue</span>
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">₦{fmt(stats?.revenue_month ?? 0)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500">Profit</span>
                                    <span className="text-sm font-bold text-emerald-600">₦{fmt(stats?.profit_month ?? 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Wallet Balance & Withdrawals */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Balance Card */}
                    <div className="bg-gradient-to-br from-[#0f6df0] to-[#0a4fad] p-6 rounded-xl shadow-lg text-white flex flex-col gap-4">
                        <div className="flex items-center gap-2 opacity-80">
                            <span className="material-symbols-outlined !text-lg">account_balance_wallet</span>
                            <span className="text-xs font-bold uppercase tracking-widest">Available Balance</span>
                        </div>
                        <div>
                            <span className="text-4xl font-black tracking-tight">₦{fmt(availableBalance)}</span>
                            <p className="text-xs mt-1 opacity-70">Profit minus recorded withdrawals</p>
                        </div>
                        <div className="border-t border-white/20 pt-4 grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <p className="opacity-60 uppercase tracking-wider">Total Profit</p>
                                <p className="font-bold text-sm mt-0.5">₦{fmt(stats?.total_profit ?? 0)}</p>
                            </div>
                            <div>
                                <p className="opacity-60 uppercase tracking-wider">Total Withdrawn</p>
                                <p className="font-bold text-sm mt-0.5">₦{fmt(withdrawalTotal)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Record Withdrawal Form */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Record Withdrawal</h3>
                        <p className="text-xs text-slate-500 mb-5">Log money taken out of the payment gateway. Balance is updated instantly — profit calculation continues unaffected.</p>
                        <form onSubmit={handleWithdraw} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1.5">Amount (NGN)</label>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    placeholder="e.g. 50000"
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm outline-none focus:border-[#0f6df0] focus:ring-2 focus:ring-[#0f6df0]/20 transition text-slate-800 dark:text-slate-200"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1.5">Note (optional)</label>
                                <input
                                    type="text"
                                    value={withdrawNote}
                                    onChange={(e) => setWithdrawNote(e.target.value)}
                                    placeholder="e.g. Bank transfer Mar 13"
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm outline-none focus:border-[#0f6df0] focus:ring-2 focus:ring-[#0f6df0]/20 transition text-slate-800 dark:text-slate-200"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={withdrawing}
                                className="w-full py-2.5 bg-[#0f6df0] text-white rounded-lg text-sm font-bold hover:bg-[#0d5ed9] transition disabled:opacity-60"
                            >
                                {withdrawing ? 'Saving…' : 'Record Withdrawal'}
                            </button>
                        </form>
                    </div>

                    {/* Withdrawal History */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Withdrawal History</h3>
                        {withdrawals.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                                <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-700 mb-2">receipt_long</span>
                                <p className="text-xs text-slate-400">No withdrawals recorded yet</p>
                            </div>
                        ) : (
                            <div className="space-y-2 overflow-y-auto max-h-64">
                                {withdrawals.map((w) => (
                                    <div key={w.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg group">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">₦{fmt(w.amount)}</p>
                                            <p className="text-[11px] text-slate-400 truncate">{w.note || new Date(w.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteWithdrawal(w.id)}
                                            className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                            title="Delete withdrawal"
                                        >
                                            <span className="material-symbols-outlined !text-base">delete</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Chart Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Revenue Performance</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Monthly revenue trend analysis</p>
                            </div>
                        </div>
                        <div className="h-[240px] w-full relative">
                            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 300">
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="#0f6df0" stopOpacity="0.2" />
                                        <stop offset="100%" stopColor="#0f6df0" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path d="M0,250 C100,240 150,220 200,180 C250,140 300,120 400,150 C500,180 600,80 700,50 L800,20 L800,300 L0,300 Z" fill="url(#chartGradient)" />
                                <path d="M0,250 C100,240 150,220 200,180 C250,140 300,120 400,150 C500,180 600,80 700,50 L800,20" fill="none" stroke="#0f6df0" strokeWidth="4" strokeLinecap="round" />
                            </svg>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Quick Summary</h3>
                        <div className="flex-1 space-y-4">
                            {[
                                { label: 'Today\'s Revenue', value: `₦${fmt(stats?.revenue_today ?? 0)}`, icon: 'today', color: 'text-[#0f6df0] bg-[#0f6df0]/10' },
                                { label: 'Today\'s Profit', value: `₦${fmt(stats?.profit_today ?? 0)}`, icon: 'trending_up', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
                                { label: 'Monthly Profit', value: `₦${fmt(stats?.profit_month ?? 0)}`, icon: 'calendar_month', color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
                                { label: 'Available Balance', value: `₦${fmt(availableBalance)}`, icon: 'account_balance_wallet', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                                            <span className="material-symbols-outlined !text-base">{item.icon}</span>
                                        </div>
                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{item.label}</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

