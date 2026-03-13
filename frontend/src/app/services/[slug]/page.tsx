'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import type { ServicePrice } from '@/lib/types';
import Link from 'next/link';
import DashboardSidebar from '@/components/DashboardSidebar';

export default function ServiceDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [prices, setPrices] = useState<ServicePrice[]>([]);
  const [serviceName, setServiceName] = useState('');
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    api.get(`/services/${slug}/countries`).then(({ data }) => {
      setPrices(data.data);
      if (data.data.length > 0) {
        setServiceName(data.data[0].service.name);
      }
    }).catch(() => {
      toast.error('Service not found');
      router.push('/services');
    }).finally(() => setLoading(false));
  }, [slug, router]);

  const filteredPrices = useMemo(() => {
      return prices.filter(p => p.country.name.toLowerCase().includes(search.toLowerCase()));
  }, [prices, search]);

  const handleBuy = async (serviceId: number, countryId: number) => {
    if (!user) {
      router.push('/login');
      return;
    }
    setBuyingId(countryId);
    try {
      const { data } = await api.post('/activations/buy', {
        service_id: serviceId,
        country_id: countryId,
      });
      const checkoutUrl = data.checkout_url ?? data.order?.lendoverify_checkout_url;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        router.push(`/activations/${data.order?.id}/verify`);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to initiate purchase');
    } finally {
      setBuyingId(null);
    }
  };

  const content = (
    <div className="flex-1 p-4 md:p-8 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <button
          className="md:hidden inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#0f6df0] mb-3"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined text-base">menu</span>
          Menu
        </button>
        <Link
          href="/services"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#0f6df0] mb-4 transition-colors"
        >
          <span className="material-icons text-base">arrow_back</span>
          Back to Services
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <span className="material-icons text-[#0f6df0] text-xl">phone_android</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{serviceName || slug}</h1>
            <p className="text-sm text-gray-500">{prices.length} countries available</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
            search
          </span>
          <input
            type="text"
            placeholder="Search countries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f6df0]/20 focus:border-[#0f6df0]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <span className="material-icons text-base">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="material-icons text-4xl text-gray-300 animate-spin">refresh</span>
        </div>
      ) : filteredPrices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
          <span className="material-icons text-5xl text-gray-300 mb-4">public_off</span>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No countries found</h3>
          <p className="text-sm text-gray-400">
            {search ? `No results for "${search}"` : 'No countries available for this service'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Country
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPrices.map((sp) => (
                <tr key={sp.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl leading-none">{sp.country.flag || '🌍'}</span>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{sp.country.name}</p>
                        <p className="text-xs text-gray-400 uppercase">{sp.country.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-base font-bold text-gray-900">
                      ₦{Number(sp.final_price).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleBuy(sp.service.id, sp.country.id)}
                      disabled={buyingId === sp.country.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#0f6df0] hover:bg-[#0d5ed9] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {buyingId === sp.country.id ? (
                        <>
                          <span className="material-icons text-base animate-spin">refresh</span>
                          Processing
                        </>
                      ) : (
                        <>
                          <span className="material-icons text-base">bolt</span>
                          Buy Now
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (user) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
        <DashboardSidebar mobileOpen={sidebarOpen} setMobileOpen={setSidebarOpen} />
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-4xl mx-auto pt-10 px-4">{content}</div>
    </div>
  );
}
