'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';
import DashboardSidebar from '@/components/DashboardSidebar';

interface Stats {
  activations_count: number;
  smm_orders_count: number;
  total_spent: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletLoading, setWalletLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ activations_count: 0, smm_orders_count: 0, total_spent: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const formatMoney = (value: number) =>
    `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;  

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    // Load wallet balance
    api.get<{ balance: number }>('/wallet/balance')
      .then((res) => setWalletBalance(Number(res.data.balance || 0)))
      .catch(() => toast.error('Failed to load wallet'))
      .finally(() => setWalletLoading(false));

    // Load dashboard stats
    api.get<Stats>('/dashboard/stats')
      .then((res) => {
        const data = res.data;
        setStats({
          activations_count: data.activations_count || 0,
          smm_orders_count: data.smm_orders_count || 0,
          total_spent: data.total_spent || 0,
        });
      })
      .catch(() => {
        // Silently fail if stats endpoint doesn't exist
        setStats({ activations_count: 0, smm_orders_count: 0, total_spent: 0 });
      })
      .finally(() => setStatsLoading(false));
  }, []);

  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f7f8]">
        <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">refresh</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f7f8]">
      <DashboardSidebar mobileOpen={sidebarOpen} setMobileOpen={setSidebarOpen} />

      <main className="flex-1 flex flex-col overflow-hidden w-full relative h-[100dvh]">
        {/* Top header */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-20">
          <div className="flex items-center gap-3 flex-1">
            <button 
              className="md:hidden mr-2 p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4 pl-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg relative hidden sm:block">
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">Welcome back</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[#0f6df0]/20 flex items-center justify-center text-[#0f6df0] font-bold border-2 border-[#0f6df0]/10 text-xl overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f5f7f8]">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Welcome Section */}
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">Welcome back, {user.name}!</h2>
              <p className="text-slate-600 text-lg">Manage your account, buy virtual numbers, or boost your social media presence</p>
            </div>

            {/* Wallet Card */}
            <div className="bg-gradient-to-br from-[#0f6df0] via-blue-600 to-cyan-600 rounded-2xl p-8 text-white shadow-lg border border-blue-400/20">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <p className="text-blue-100 text-sm font-semibold mb-2 uppercase tracking-wide">Wallet Balance</p>
                  <p className="text-4xl md:text-5xl font-black">{walletLoading ? '...' : formatMoney(walletBalance)}</p>
                </div>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
                </div>
              </div>

              <button
                onClick={() => router.push('/wallet/fund')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#0f6df0] font-bold rounded-xl hover:bg-slate-50 transition-all hover:shadow-lg"
              >
                <span className="material-symbols-outlined">add_circle</span>
                Fund Wallet
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Active Numbers</h3>
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                    <span className="material-symbols-outlined">sim_card</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">
                  {statsLoading ? '...' : stats.activations_count}
                </p>
                <p className="text-xs text-slate-500 mt-2">Total virtual numbers purchased</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">SMM Orders</h3>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    <span className="material-symbols-outlined">trending_up</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">
                  {statsLoading ? '...' : stats.smm_orders_count}
                </p>
                <p className="text-xs text-slate-500 mt-2">Total social media boost orders</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Spent</h3>
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                    <span className="material-symbols-outlined">attach_money</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">
                  {statsLoading ? '...' : formatMoney(stats.total_spent)}
                </p>
                <p className="text-xs text-slate-500 mt-2">Lifetime spending</p>
              </div>
            </div>

            {/* Main CTA Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-900">What would you like to do?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Buy Virtual Number */}
                <button
                  onClick={() => router.push('/virtual-numbers')}
                  className="group relative overflow-hidden rounded-2xl p-8 text-left transition-all hover:shadow-2xl hover:scale-105"
                >
                  {/* Animated background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 group-hover:from-emerald-500 group-hover:to-cyan-700 transition-all" />
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h4 className="text-2xl font-black text-white mb-2">Buy Virtual Number</h4>
                        <p className="text-emerald-100 text-sm">Get verified instantly with numbers from 50+ countries</p>
                      </div>
                      <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-all">
                        <span className="material-symbols-outlined text-3xl text-white">phone_in_check</span>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-emerald-50">
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        <span className="text-sm">WhatsApp, Google, Telegram & more</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-50">
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        <span className="text-sm">Premium operators with 80%+ success rate</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-50">
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        <span className="text-sm">Instant SMS delivery in seconds</span>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg text-white font-bold text-sm group-hover:bg-white/30 transition-all">
                      Browse Numbers
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </div>
                  </div>
                </button>

                {/* Boost Social Media */}
                <button
                  onClick={() => router.push('/smm/services')}
                  className="group relative overflow-hidden rounded-2xl p-8 text-left transition-all hover:shadow-2xl hover:scale-105"
                >
                  {/* Animated background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-500 to-rose-600 group-hover:from-purple-500 group-hover:to-rose-700 transition-all" />
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h4 className="text-2xl font-black text-white mb-2">Boost Social Media</h4>
                        <p className="text-purple-100 text-sm">Grow your followers, likes, views & engagement instantly</p>
                      </div>
                      <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-all">
                        <span className="material-symbols-outlined text-3xl text-white">trending_up</span>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-purple-50">
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        <span className="text-sm">Instagram, TikTok, YouTube & more</span>
                      </div>
                      <div className="flex items-center gap-2 text-purple-50">
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        <span className="text-sm">Real, organic growth with high retention</span>
                      </div>
                      <div className="flex items-center gap-2 text-purple-50">
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        <span className="text-sm">100+ services to choose from</span>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg text-white font-bold text-sm group-hover:bg-white/30 transition-all">
                      Browse Services
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Info Section */}
            <div className="bg-gradient-to-r from-blue-50 via-cyan-50 to-emerald-50 border border-blue-200 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Why Choose SMS Gang?</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm mb-1">Fast & Reliable</p>
                    <p className="text-xs text-slate-600">Instant delivery with 95%+ success rate</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600 font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm mb-1">Affordable Pricing</p>
                    <p className="text-xs text-slate-600">Competitive rates with no hidden fees</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 text-purple-600 font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm mb-1">Global Coverage</p>
                    <p className="text-xs text-slate-600">Numbers from 50+ countries worldwide</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600 font-bold">
                    4
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm mb-1">24/7 Support</p>
                    <p className="text-xs text-slate-600">We're here to help whenever you need</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => router.push('/activations')}
                className="p-4 rounded-xl bg-white border border-slate-200 hover:border-[#0f6df0] hover:shadow-md transition-all text-center"
              >
                <span className="material-symbols-outlined text-3xl text-[#0f6df0] block mb-2">history</span>
                <p className="text-xs font-bold text-slate-900">My Activations</p>
              </button>

              <button
                onClick={() => router.push('/orders')}
                className="p-4 rounded-xl bg-white border border-slate-200 hover:border-[#0f6df0] hover:shadow-md transition-all text-center"
              >
                <span className="material-symbols-outlined text-3xl text-[#0f6df0] block mb-2">shopping_cart</span>
                <p className="text-xs font-bold text-slate-900">My Orders</p>
              </button>

              <button
                onClick={() => router.push('/transactions')}
                className="p-4 rounded-xl bg-white border border-slate-200 hover:border-[#0f6df0] hover:shadow-md transition-all text-center"
              >
                <span className="material-symbols-outlined text-3xl text-[#0f6df0] block mb-2">receipt_long</span>
                <p className="text-xs font-bold text-slate-900">Transactions</p>
              </button>

              <button
                onClick={() => router.push('/settings')}
                className="p-4 rounded-xl bg-white border border-slate-200 hover:border-[#0f6df0] hover:shadow-md transition-all text-center"
              >
                <span className="material-symbols-outlined text-3xl text-[#0f6df0] block mb-2">settings</span>
                <p className="text-xs font-bold text-slate-900">Settings</p>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
