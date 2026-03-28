'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { Service, ServicePrice } from '@/lib/types';
import { useAuthStore } from '@/store/auth';
import DashboardSidebar from '@/components/DashboardSidebar';
import OperatorSelectionCard from '@/components/OperatorSelectionCard';

type ServiceStyle = { icon: string; bg: string; text: string; hot?: boolean };

const SERVICE_STYLES: Record<string, ServiceStyle> = {
  whatsapp:  { icon: 'chat',           bg: 'bg-green-100',     text: 'text-green-600'  },
  google:    { icon: 'mail',           bg: 'bg-blue-100',      text: 'text-blue-600'   },
  telegram:  { icon: 'send',           bg: 'bg-sky-100',       text: 'text-sky-600',   hot: true },
  facebook:  { icon: 'public',         bg: 'bg-indigo-100',    text: 'text-indigo-600' },
  instagram: { icon: 'photo_camera',   bg: 'bg-pink-100',      text: 'text-pink-600'   },
  tiktok:    { icon: 'music_note',     bg: 'bg-slate-100',     text: 'text-slate-800'  },
  twitter:   { icon: 'close',          bg: 'bg-slate-900',     text: 'text-white'      },
  x:         { icon: 'close',          bg: 'bg-slate-900',     text: 'text-white'      },
  netflix:   { icon: 'smart_display',  bg: 'bg-red-100',       text: 'text-red-600'    },
  discord:   { icon: 'sports_esports', bg: 'bg-[#5865F2]/20',  text: 'text-[#5865F2]'  },
  amazon:    { icon: 'shopping_cart',  bg: 'bg-orange-100',    text: 'text-orange-600' },
  snapchat:  { icon: 'chat_bubble',    bg: 'bg-yellow-100',    text: 'text-yellow-500' },
  uber:      { icon: 'directions_car', bg: 'bg-slate-900',     text: 'text-white'      },
  microsoft: { icon: 'window',         bg: 'bg-blue-100',      text: 'text-blue-600'   },
  apple:     { icon: 'phone_iphone',   bg: 'bg-slate-100',     text: 'text-slate-900'  },
};

const getStyle = (name: string): ServiceStyle => {
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (SERVICE_STYLES[key]) return SERVICE_STYLES[key];
  const match = Object.entries(SERVICE_STYLES).find(([k]) => key.includes(k));
  return match ? match[1] : { icon: 'sms', bg: 'bg-[#0f6df0]/10', text: 'text-[#0f6df0]' };
};

export default function VirtualNumbersPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [servicePage, setServicePage] = useState(1);
  const [serviceMeta, setServiceMeta] = useState({ current_page: 1, last_page: 1, per_page: 40, total: 0 });
  const [selected, setSelected] = useState<Service | null>(null);
  const [countries, setCountries] = useState<ServicePrice[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<ServicePrice | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletLoading, setWalletLoading] = useState(true);
  const { user, loading: authLoading } = useAuthStore();
  const router = useRouter();

  const formatMoney = (value: number) =>
    `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;  

  interface OperatorOption {
    id: string;
    country_id: number;
    country_name: string;
    country_code: string;
    country_flag: string;
    operator_name: string;
    cost_usd: number;
    final_price: number;
    stock_count: number;
    service_id: number;
    success_rates?: {
      instant?: number;
      '1h'?: number;
      '3h'?: number;
      '24h'?: number;
      '3d'?: number;
      '7d'?: number;
      '30d'?: number;
    };
    best_success_rate?: number;
  }

  const allOperators = useMemo(() => {
    const flattened: OperatorOption[] = [];
    countries.forEach((sp) => {
      (sp.operators ?? []).forEach((op) => {
        const opRates = (op as any).success_rates || {};
        const numericRates = Object.values(opRates)
          .map((v) => Number(v))
          .filter((v) => Number.isFinite(v));
        const operatorBestRate = numericRates.length > 0 ? Math.max(...numericRates) : 0;

        const finalPrice = Number((op as any).final_price ?? (op as any).price ?? 0);
        const stockCount = Number((op as any).count ?? (op as any).stock_count ?? 0);
        const operatorName = String((op as any).name ?? (op as any).operator ?? 'Unknown');

        flattened.push({
          id: `${sp.id}:${operatorName}`,
          country_id: sp.country.id,
          country_name: sp.country.name,
          country_code: sp.country.code,
          country_flag: sp.country.flag || '🌍',
          operator_name: operatorName,
          cost_usd: Number((op as any).cost ?? 0),
          final_price: Number.isFinite(finalPrice) ? finalPrice : 0,
          stock_count: Number.isFinite(stockCount) ? stockCount : 0,
          service_id: sp.service.id,
          success_rates: opRates,
          best_success_rate: operatorBestRate,
        });
      });
    });
    return flattened;
  }, [countries]);

  const MIN_DISPLAY_THRESHOLD = 62;
  const BEST_QUALITY_THRESHOLD = 82;

  const displayFilteredOperators = useMemo(() => {
    return allOperators.filter(op => {
      const successRate = op.best_success_rate || 0;
      return successRate >= MIN_DISPLAY_THRESHOLD && op.stock_count > 0;
    });
  }, [allOperators]);

  const fallbackOperators = useMemo(() => {
    return allOperators.filter((op) => op.stock_count > 0);
  }, [allOperators]);

  const activeOperatorPool = useMemo(() => {
    return displayFilteredOperators.length > 0 ? displayFilteredOperators : fallbackOperators;
  }, [displayFilteredOperators, fallbackOperators]);

  const usingFallbackOperators = useMemo(() => {
    return displayFilteredOperators.length === 0 && fallbackOperators.length > 0;
  }, [displayFilteredOperators, fallbackOperators]);

  const hasBestQualityOperators = useMemo(() => {
    return activeOperatorPool.some((op) => (op.best_success_rate || 0) >= BEST_QUALITY_THRESHOLD);
  }, [activeOperatorPool]);

  const filteredOperators = useMemo(() => {
    if (!modalSearch) return activeOperatorPool;
    const q = modalSearch.toLowerCase();
    return activeOperatorPool.filter(op =>
      op.country_name.toLowerCase().includes(q) ||
      op.country_code.toLowerCase().includes(q) ||
      op.operator_name.toLowerCase().includes(q)
    );
  }, [activeOperatorPool, modalSearch]);

  const sortedOperators = useMemo(() => {
    return [...filteredOperators].sort((a, b) => {
      const rateA = a.best_success_rate || 0;
      const rateB = b.best_success_rate || 0;
      if (rateA !== rateB) return rateB - rateA;
      return a.final_price - b.final_price;
    });
  }, [filteredOperators]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const loadServices = useCallback((page = 1, query = '') => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      per_page: '40',
    });

    if (query.trim()) {
      params.set('search', query.trim());
    }

    api.get(`/services?${params.toString()}`)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
        const meta = !Array.isArray(res.data) ? (res.data.meta || null) : null;

        setServices(data);
        setServiceMeta({
          current_page: meta?.current_page || page,
          last_page: meta?.last_page || 1,
          per_page: meta?.per_page || 40,
          total: meta?.total || data.length,
        });
      })
      .catch(() => toast.error('Failed to load services'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setServicePage(1);
    loadServices(1, debouncedSearch);
  }, [debouncedSearch, loadServices]);

  useEffect(() => {
    api.get<{ balance: number }>('/wallet/balance')
      .then((res) => setWalletBalance(Number(res.data.balance || 0)))
      .catch(() => {})
      .finally(() => setWalletLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const selectService = (service: Service) => {
    setSelected(service);
    setSelectedCountry(null);
    setCountries([]);
    setLoadingCountries(true);
    document.body.style.overflow = 'hidden';
    
    api.get(`/services/${service.slug}/countries`)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
        setCountries(data);
      })
      .catch((err: unknown) => {
        const e = err as { response?: { data?: { message?: string; error?: string } } };
        toast.error(e.response?.data?.error ?? e.response?.data?.message ?? 'Failed to load countries');
      })
      .finally(() => setLoadingCountries(false));
  };

  const closeSelection = () => {
    setSelected(null);
    setModalSearch('');
    setSelectedOperator(null);
    document.body.style.overflow = '';
  };

  const handleBuy = async () => {
    if (!user) { router.push('/login'); return; }
    if (!selectedOperator) return;
    
    const operator = sortedOperators.find(op => op.id === selectedOperator);
    if (!operator) return;

    setBuying(true);
    try {
      const { data } = await api.post('/activations/buy', {
        service_id: operator.service_id,
        country_id: operator.country_id,
        operator: operator.operator_name,
      });
      const url =
        data.payment_gateway_link
        ?? data.checkout_url
        ?? data.order?.checkout_url
        ?? data.order?.lendoverify_checkout_url;

      if (url) {
        window.location.href = url;
      } else {
        router.push(`/activations/${data.order?.id}/verify`);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Failed to initiate purchase');
    } finally {
      setBuying(false);
    }
  };

  const selStyle = selected ? getStyle(selected.name) : null;

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
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-20">
          <div className="flex items-center gap-2 md:gap-0 flex-1">
            <button 
                className="md:hidden mr-2 p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                onClick={() => setSidebarOpen(true)}
            >
                <span className="material-symbols-outlined">menu</span>
            </button>

            <div className="relative group w-full max-w-xl">
                <span
                className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0f6df0]"
                style={{ fontSize: 20 }}
                >
                search
                </span>
                <input
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-[#0f6df0]/20 focus:bg-white outline-none text-sm transition-all"
                placeholder="Search for a service..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                />
            </div>
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
                <p className="text-xs text-slate-500">Free Account</p>
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

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f5f7f8]">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Select a Service</h2>
            <p className="text-slate-600">Choose from 15+ services. We support WhatsApp, Google, Telegram, Facebook, Instagram, TikTok and more.</p>
            <p className="text-xs text-emerald-700 mt-2 font-semibold">We show operators from 62%+ success rate and prioritize 82%+ as best quality.</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 pb-20">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="aspect-square md:h-36 bg-white rounded-xl border border-slate-200 animate-pulse shadow-sm" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 pb-8">
                {services.map((service) => {
                  const style = getStyle(service.name);
                  const isSelected = selected?.id === service.id;
                  return (
                    <button
                      key={service.id}
                      onClick={() => selectService(service)}
                      className={`flex flex-col items-center justify-center p-4 md:p-6 bg-white rounded-xl border transition-all group relative overflow-hidden aspect-square md:aspect-auto md:h-40 ${
                          isSelected
                          ? 'border-[#0f6df0] shadow-lg shadow-[#0f6df0]/10 bg-[#0f6df0]/[0.02] ring-1 ring-[#0f6df0]'
                          : 'border-slate-200 hover:border-[#0f6df0] hover:shadow-md'
                      }`}
                    >
                      {style.hot && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-rose-500 text-[9px] md:text-[10px] text-white font-bold rounded shadow-sm">
                          HOT
                        </div>
                      )}
                      <div
                        className={`w-12 h-12 md:w-14 md:h-14 rounded-full ${style.bg} flex items-center justify-center ${style.text} mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300`}
                      >
                        <span className="material-symbols-outlined text-[26px] md:text-[32px]">{style.icon}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-xs md:text-sm text-center line-clamp-1 w-full">{service.name}</h3>
                      <p className="text-[10px] md:text-xs text-slate-400 mt-1 font-medium">Auto-detect</p>
                    </button>
                  );
                })}

                {!loading && services.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                      <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                      <p>No services found matching &quot;{search}&quot;</p>
                  </div>
                )}
              </div>

              {serviceMeta.last_page > 1 && (
                <div className="flex items-center justify-center gap-2 pb-4">
                  <button
                    onClick={() => {
                      const nextPage = Math.max(1, servicePage - 1);
                      setServicePage(nextPage);
                      loadServices(nextPage, debouncedSearch);
                    }}
                    disabled={servicePage === 1 || loading}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-slate-600 px-2">
                    Page {serviceMeta.current_page} of {serviceMeta.last_page}
                  </span>
                  <button
                    onClick={() => {
                      const nextPage = Math.min(serviceMeta.last_page, servicePage + 1);
                      setServicePage(nextPage);
                      loadServices(nextPage, debouncedSearch);
                    }}
                    disabled={servicePage >= serviceMeta.last_page || loading}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}

          {selected && (
            <div className="fixed inset-0 z-[60]">
               <div
               className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in transition-opacity"
               onClick={closeSelection}
               />

               <div className="absolute inset-0 md:p-6 md:flex md:items-center md:justify-center">
                <div
                  className="h-full w-full bg-white rounded-none md:rounded-2xl shadow-2xl overflow-hidden flex flex-col md:max-w-5xl md:max-h-[88vh]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 flex-shrink-0 bg-white z-10">
                    <div className="flex items-center gap-4">
                      {selStyle && (
                        <div className={`hidden md:flex w-12 h-12 rounded-xl ${selStyle.bg} items-center justify-center ${selStyle.text}`}>
                          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>{selStyle.icon}</span>
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
                          <button onClick={closeSelection} className="md:hidden -ml-2 p-1 text-slate-500">
                            <span className="material-symbols-outlined">arrow_back</span>
                          </button>
                          Configure {selected.name}
                        </h3>
                        <p className="text-xs md:text-sm text-slate-500">Select country, check stock and confirm price.</p>
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-[11px] font-bold border border-emerald-200">
                          <span className="material-symbols-outlined text-sm">verified</span>
                          Operators from 62%+ are shown. 82%+ success rate is best quality.
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={closeSelection}
                      className="hidden md:flex w-8 h-8 items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  <div className="flex-1 min-h-0 flex flex-col md:flex-row bg-slate-50/50">
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 md:border-r border-slate-200 flex flex-col">
                      <div className="sticky top-0 bg-slate-50/95 backdrop-blur py-2 z-10 mb-4 -mx-4 md:-mx-6 px-4 md:px-6">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                          1. Select Your Number & Operator (62%+ shown, 82%+ best)
                        </label>
                        <input
                          type="text"
                          placeholder="Search by country, operator..."
                          value={modalSearch}
                          onChange={(e) => setModalSearch(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f6df0]/30"
                        />
                        {usingFallbackOperators && (
                          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            No operators met 62% success rate for this service right now. Showing best available operators.
                          </div>
                        )}
                        {!usingFallbackOperators && !hasBestQualityOperators && (
                          <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                            You are seeing 62%+ operators. For the highest reliability, 82%+ success rate is recommended.
                          </div>
                        )}
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-2">
                        {loadingCountries ? (
                          <div className="text-center py-8 text-slate-500">Loading countries...</div>
                        ) : sortedOperators.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">No operators found</div>
                        ) : (
                          sortedOperators.map((op) => (
                            <OperatorSelectionCard
                              key={op.id}
                              id={op.id}
                              countryName={op.country_name}
                              countryCode={op.country_code}
                              countryFlag={op.country_flag}
                              operatorName={op.operator_name}
                              finalPrice={Number(op.final_price || 0)}
                              stockCount={Number(op.stock_count || 0)}
                              successRates={op.success_rates}
                              bestSuccessRate={op.best_success_rate}
                              isSelected={selectedOperator === op.id}
                              isDisabled={false}
                              onSelect={() => setSelectedOperator(op.id)}
                            />
                          ))
                        )}
                      </div>
                    </div>

                    <div className="w-full md:w-80 flex-shrink-0 border-t md:border-t-0 md:border-l border-slate-200 p-4 md:p-6 bg-white overflow-y-auto flex flex-col">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                        2. Review & Confirm
                      </label>

                      {selectedOperator && (() => {
                        const op = sortedOperators.find(x => x.id === selectedOperator);
                        return op ? (
                          <div className="space-y-4 flex-1">
                            <div className="rounded-xl bg-slate-100 p-4">
                              <p className="text-xs text-slate-600 font-semibold mb-1">Country</p>
                              <p className="font-bold text-slate-900">{(op.country_flag || '🌍')} {op.country_name}</p>
                            </div>

                            <div className="rounded-xl bg-slate-100 p-4">
                              <p className="text-xs text-slate-600 font-semibold mb-1">Operator</p>
                              <p className="font-bold text-slate-900">{op.operator_name}</p>
                            </div>

                            <div className="rounded-xl bg-slate-100 p-4">
                              <p className="text-xs text-slate-600 font-semibold mb-1">Success Rate</p>
                              <p className="font-bold text-emerald-600">{op.best_success_rate}%</p>
                            </div>

                            <div className="rounded-xl bg-slate-100 p-4">
                              <p className="text-xs text-slate-600 font-semibold mb-1">Stock Available</p>
                              <p className="font-bold text-slate-900">{op.stock_count} numbers</p>
                            </div>

                            <div className="rounded-xl bg-gradient-to-br from-[#0f6df0]/10 to-blue-100 p-4 border border-[#0f6df0]/20">
                              <p className="text-xs text-slate-600 font-semibold mb-1">Price</p>
                              <p className="text-2xl font-black text-[#0f6df0]">{formatMoney(op.final_price)}</p>
                              <p className="text-xs text-slate-500 mt-2">Includes VAT and all fees</p>
                            </div>

                            {walletBalance < op.final_price && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-xs font-bold text-red-700">Insufficient balance!</p>
                                <p className="text-xs text-red-600 mt-1">You need {formatMoney(op.final_price - walletBalance)} more</p>
                              </div>
                            )}

                            <button
                              onClick={handleBuy}
                              disabled={buying || walletBalance < op.final_price}
                              className="w-full mt-auto px-4 py-3 rounded-lg bg-[#0f6df0] text-white font-bold hover:bg-[#0d5ed9] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                              <span className="material-symbols-outlined">{buying ? 'refresh' : 'shopping_cart'}</span>
                              {buying ? 'Processing...' : 'Buy Now'}
                            </button>
                          </div>
                        ) : null;
                      })()}

                      {!selectedOperator && (
                        <div className="flex-1 flex items-center justify-center text-slate-500">
                          <div className="text-center">
                            <span className="material-symbols-outlined text-4xl mb-2 block">arrow_left</span>
                            <p className="text-sm">Select an operator to see price</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
