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
  const [buying, setBuying] = useState(false);
  const { user, loading: authLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    api.get('/services')
      .then(({ data }) => setServices(data.data ?? data))
      .catch(() => toast.error('Failed to load services'))
      .finally(() => setLoading(false));
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
    api.get(`/services/${service.slug}/countries`)
      .then(({ data }) => setCountries(data.data ?? data))
      .catch(() => toast.error('Failed to load countries'))
      .finally(() => setLoadingCountries(false));
  };

  const handleBuy = async () => {
    if (!user) { router.push('/login'); return; }
    if (!selectedCountry) return;
    setBuying(true);
    try {
      const { data } = await api.post('/activations/buy', {
        service_id: selectedCountry.service.id,
        country_id: selectedCountry.country.id,
      });
      const url = data.checkout_url ?? data.order?.lendoverify_checkout_url;
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
      <DashboardSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* ── Top header ─── */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex-1 max-w-xl">
            <div className="relative group">
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

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg relative">
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="h-8 w-px bg-slate-200" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">Free Account</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[#0f6df0]/20 flex items-center justify-center text-[#0f6df0] font-bold border-2 border-[#0f6df0]/10 text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* ── Scrollable content ─── */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2 text-slate-900">Buy a Number</h2>
            <p className="text-slate-500">
              Select a service to start receiving SMS verifications instantly via direct payment.
            </p>
          </div>

          {/* Service Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-36 bg-white rounded-xl border border-slate-200 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map((service) => {
                const style = getStyle(service.name);
                return (
                  <button
                    key={service.id}
                    onClick={() => selectService(service)}
                    className={`flex flex-col items-center p-6 bg-white rounded-xl border transition-all group relative overflow-hidden ${
                      selected?.id === service.id
                        ? 'border-[#0f6df0] shadow-lg shadow-[#0f6df0]/10 bg-[#0f6df0]/[0.02]'
                        : 'border-slate-200 hover:border-[#0f6df0] hover:shadow-lg'
                    }`}
                  >
                    {style.hot && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#0f6df0] text-[10px] text-white font-bold rounded">
                        HOT
                      </div>
                    )}
                    <div
                      className={`w-14 h-14 rounded-full ${style.bg} flex items-center justify-center ${style.text} mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 28 }}>{style.icon}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">{service.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">Select country</p>
                  </button>
                );
              })}

              {/* Other Services card */}
              <button
                onClick={() => setSearch('')}
                className="flex flex-col items-center p-6 bg-slate-100 rounded-xl border border-dashed border-slate-300 hover:bg-slate-200 transition-all group"
              >
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-slate-400 mb-4">
                  <span className="material-symbols-outlined" style={{ fontSize: 28 }}>add</span>
                </div>
                <h3 className="font-bold text-slate-600 text-sm">Other Services</h3>
                <p className="text-xs text-slate-500 mt-1">Browse 100+ platforms</p>
              </button>
            </div>
          )}

          {/* Configure Activation panel */}
          {selected && (
            <div className="mt-12 p-8 bg-white rounded-2xl border border-slate-200 shadow-xl max-w-4xl mx-auto">
              {/* Panel header */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  {selStyle && (
                    <div className={`w-12 h-12 rounded-lg ${selStyle.bg} flex items-center justify-center ${selStyle.text}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: 24 }}>{selStyle.icon}</span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Configure {selected.name} Activation</h3>
                    <p className="text-sm text-slate-500">Select your preferred country to proceed with direct payment.</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Country list */}
                <div>
                  <label className="block text-sm font-semibold mb-3 text-slate-900">1. Select Country</label>
                  {loadingCountries ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : countries.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 text-sm">No countries available</p>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {countries.map((sp) => (
                        <button
                          key={sp.id}
                          onClick={() => setSelectedCountry(sp)}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                            selectedCountry?.id === sp.id
                              ? 'border-[#0f6df0] bg-[#0f6df0]/5'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl leading-none">{sp.country.flag ?? '🌍'}</span>
                            <span className="font-medium text-slate-900 text-sm">{sp.country.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900 text-sm">₦{Number(sp.final_price).toLocaleString()}</p>
                            <p className="text-[10px] text-green-500 uppercase font-bold">In Stock</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Order summary */}
                <div className="flex flex-col">
                  <label className="block text-sm font-semibold mb-3 text-slate-900">2. Order Summary</label>
                  <div className="bg-slate-50 rounded-xl p-6 flex flex-col flex-1">
                    <div className="space-y-4 flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Service</span>
                        <span className="font-semibold text-slate-900">{selected.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Country</span>
                        <span className="font-semibold text-slate-900">
                          {selectedCountry ? selectedCountry.country.name : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Validity</span>
                        <span className="font-semibold text-slate-900">20 Minutes</span>
                      </div>
                      <div className="h-px bg-slate-200 my-2" />
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">Total Price</span>
                        <span className="text-2xl font-bold text-[#0f6df0]">
                          {selectedCountry ? `₦${Number(selectedCountry.final_price).toLocaleString()}` : '₦—'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-8 space-y-4">
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <p className="text-[11px] text-blue-700 flex items-start gap-2">
                          <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 14 }}>info</span>
                          Clicking &apos;Purchase Now&apos; will securely redirect you to{' '}
                          <strong>Lendoverify payment gateway</strong> to complete your transaction.
                        </p>
                      </div>
                      <button
                        onClick={handleBuy}
                        disabled={!selectedCountry || buying}
                        className="w-full bg-[#0f6df0] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#0d5ed9] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ boxShadow: '0 4px 16px rgba(15,109,240,0.25)' }}
                      >
                        {buying ? (
                          <>
                            <span className="material-symbols-outlined animate-spin" style={{ fontSize: 20 }}>refresh</span>
                            Processing...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>payment</span>
                            Purchase Now
                          </>
                        )}
                      </button>
                      <p className="text-[10px] text-center text-slate-400">
                        Instant activation upon successful payment confirmation.
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
