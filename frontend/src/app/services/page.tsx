'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { Service, ServicePrice } from '@/lib/types';
import { useAuthStore } from '@/store/auth';
import DashboardSidebar from '@/components/DashboardSidebar';

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

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Service | null>(null);
  const [countries, setCountries] = useState<ServicePrice[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<ServicePrice | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading: authLoading } = useAuthStore();
  const router = useRouter();

  // Flatten all operators from all countries
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
  }

  const allOperators = useMemo(() => {
    const flattened: OperatorOption[] = [];
    countries.forEach((sp) => {
      (sp.operators ?? []).forEach((op) => {
        flattened.push({
          id: `${sp.id}:${op.name}`,
          country_id: sp.country.id,
          country_name: sp.country.name,
          country_code: sp.country.code,
          country_flag: sp.country.flag || '🌍',
          operator_name: op.name,
          cost_usd: op.cost,
          final_price: op.final_price,
          stock_count: op.count,
          service_id: sp.service.id,
        });
      });
    });
    return flattened;
  }, [countries]);

  // Filter operators by search
  const filteredOperators = useMemo(() => {
    if (!modalSearch) return allOperators;
    const q = modalSearch.toLowerCase();
    return allOperators.filter(op =>
      op.country_name.toLowerCase().includes(q) ||
      op.country_code.toLowerCase().includes(q) ||
      op.operator_name.toLowerCase().includes(q)
    );
  }, [allOperators, modalSearch]);

  // Sort operators by price
  const sortedOperators = useMemo(() => {
    return [...filteredOperators].sort((a, b) => a.final_price - b.final_price);
  }, [filteredOperators]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    api.get('/services')
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
        setServices(data);
      })
      .catch(() => toast.error('Failed to load services'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const filtered = useMemo(
    () => services.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())),
    [services, search],
  );

  const selectService = (service: Service) => {
    setSelected(service);
    setSelectedCountry(null);
    setCountries([]);
    setLoadingCountries(true);
    // Prevent background scrolling while modal is open
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
    
    // Find the operator object to get service and country IDs
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
        {/* ── Top header ─── */}
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

        {/* ── Scrollable content ─── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f5f7f8]">
          <div className="mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold mb-2 text-slate-900">Buy a Number</h2>
            <p className="text-sm md:text-base text-slate-500">
              Select a service to start receiving SMS verifications instantly.
            </p>
          </div>

          {/* Service Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 pb-20">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="aspect-square md:h-36 bg-white rounded-xl border border-slate-200 animate-pulse shadow-sm" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 pb-24 md:pb-8">
              {filtered.map((service) => {
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

              {!loading && filtered.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                    <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                    <p>No services found matching &quot;{search}&quot;</p>
                </div>
              )}
            </div>
          )}

            {/* Configure Activation Panel */}
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
                  {/* Header */}
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
                      </div>
                    </div>
                    <button
                      onClick={closeSelection}
                      className="hidden md:flex w-8 h-8 items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  {/* Content Body */}
                  <div className="flex-1 min-h-0 flex flex-col md:flex-row bg-slate-50/50">
                    {/* Left: Operators Selection */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 md:border-r border-slate-200 flex flex-col">
                      <div className="sticky top-0 bg-slate-50/95 backdrop-blur py-2 z-10 mb-3 -mx-4 md:-mx-6 px-4 md:px-6">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                          1. Search & Select Operator
                        </label>
                        <div className="relative">
                          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                            search
                          </span>
                          <input
                            type="text"
                            placeholder="Search country, code, or operator..."
                            value={modalSearch}
                            onChange={(e) => setModalSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f6df0]/20 focus:border-[#0f6df0]"
                          />
                          {modalSearch && (
                            <button
                              onClick={() => setModalSearch('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <span className="material-icons text-base">close</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {loadingCountries ? (
                        <div className="space-y-3">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse" />
                          ))}
                        </div>
                      ) : sortedOperators.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <span className="material-icons text-4xl text-slate-300 mb-2">public_off</span>
                          <p className="text-slate-500 font-medium">No operators found</p>
                          <p className="text-xs text-slate-400">{modalSearch ? `Try a different search` : 'Try again later'}</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 pb-4">
                          {sortedOperators.map((op) => (
                            <button
                              key={op.id}
                              onClick={() => setSelectedOperator(op.id)}
                              disabled={op.stock_count <= 0}
                              className={`
                                group flex items-center justify-between p-3 md:p-4 rounded-xl border transition-all relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed
                                ${selectedOperator === op.id
                                  ? 'bg-white border-[#0f6df0] shadow-[0_0_0_1px_#0f6df0] z-10'
                                  : 'bg-white border-slate-200 hover:border-[#0f6df0] hover:shadow-md'
                                }
                              `}
                            >
                              <div className="flex items-center gap-3 md:gap-4 relative z-10 flex-1 min-w-0">
                                <span className="text-2xl md:text-3xl flex-shrink-0">{op.country_flag}</span>
                                <div className="text-left min-w-0">
                                  <p className="font-bold text-slate-900 text-sm md:text-base">{op.country_name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] md:text-xs text-slate-400 font-medium uppercase tracking-wide">{op.country_code}</span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] md:text-xs font-semibold">
                                      {op.operator_name}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right relative z-10 flex-shrink-0 ml-2">
                                <p className="font-black text-[#0f6df0] text-sm md:text-lg">₦{Number(op.final_price).toLocaleString()}</p>
                                <p className={`text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded-md inline-block mt-1 ${
                                  op.stock_count > 0
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-red-50 text-red-600'
                                }`}>
                                  {op.stock_count > 0 ? `${op.stock_count} in stock` : 'Out of stock'}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: Order Summary */}
                    <div className="w-full md:w-80 md:flex-shrink-0 bg-white border-t md:border-t-0 md:border-l border-slate-200 p-4 md:p-6 flex flex-col gap-4">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                        2. Order Details
                      </label>

                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Service</span>
                            <span className="font-bold text-slate-900 flex items-center gap-1">
                              {selStyle && <span className={`material-symbols-outlined text-[16px] ${selStyle.text}`}>{selStyle.icon}</span>}
                              {selected.name}
                            </span>
                          </div>
                          {selectedOperator && sortedOperators.find(op => op.id === selectedOperator) && (
                            <>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Country</span>
                                <span className="font-bold text-slate-900">
                                  {sortedOperators.find(op => op.id === selectedOperator)?.country_name}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Operator</span>
                                <span className="font-bold text-slate-900">
                                  {sortedOperators.find(op => op.id === selectedOperator)?.operator_name}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Stock</span>
                                <span className="font-bold text-slate-900">
                                  {sortedOperators.find(op => op.id === selectedOperator)?.stock_count} available
                                </span>
                              </div>
                            </>
                          )}
                          <div className="h-px bg-slate-200 my-2" />
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-700">Total</span>
                            <span className="font-black text-xl text-[#0f6df0]">
                              {selectedOperator ? `₦${Number(sortedOperators.find(op => op.id === selectedOperator)?.final_price ?? 0).toLocaleString()}` : '₦0'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleBuy}
                        disabled={!selectedOperator || buying}
                        className="w-full py-3.5 bg-[#0f6df0] hover:bg-[#0d5ed9] text-white rounded-xl font-bold text-base shadow-lg shadow-[#0f6df0]/25 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        {buying ? (
                          <>
                            <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                            Processing...
                          </>
                        ) : (
                          <>
                            Purchase Number
                            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                          </>
                        )}
                      </button>

                      <p className="text-center text-[10px] text-slate-400">
                        Secure payment via gateway checkout
                      </p>
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
