'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import type { ServicePrice } from '@/lib/types';
import Link from 'next/link';
import DashboardSidebar from '@/components/DashboardSidebar';

interface OperatorOption {
  id: string; // unique key: price_id:operator_name
  price_id: number;
  service_id: number;
  country_id: number;
  country_name: string;
  country_code: string;
  country_flag: string;
  operator_name: string;
  cost_usd: number;
  final_price: number;
  stock_count: number;
}

export default function ServiceDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [prices, setPrices] = useState<ServicePrice[]>([]);
  const [serviceName, setServiceName] = useState('');
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
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

  // Flatten all operators from all countries
  const allOperators = useMemo(() => {
    const flattened: OperatorOption[] = [];
    prices.forEach((sp) => {
      (sp.operators ?? []).forEach((op) => {
        flattened.push({
          id: `${sp.id}:${op.name}`,
          price_id: sp.id,
          service_id: sp.service.id,
          country_id: sp.country.id,
          country_name: sp.country.name,
          country_code: sp.country.code,
          country_flag: sp.country.flag || '🌍',
          operator_name: op.name,
          cost_usd: op.cost,
          final_price: op.final_price,
          stock_count: op.count,
        });
      });
    });
    return flattened;
  }, [prices]);

  // Filter by search (country name)
  const filteredOperators = useMemo(() => {
    if (!search) return allOperators;
    const q = search.toLowerCase();
    return allOperators.filter(op => 
      op.country_name.toLowerCase().includes(q) || 
      op.country_code.toLowerCase().includes(q) ||
      op.operator_name.toLowerCase().includes(q)
    );
  }, [allOperators, search]);

  // Sort by price (cheapest first)
  const sortedOperators = useMemo(() => {
    return [...filteredOperators].sort((a, b) => a.final_price - b.final_price);
  }, [filteredOperators]);

  const handleBuy = async (operator: OperatorOption) => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (operator.stock_count <= 0) {
      toast.error('This operator is out of stock');
      return;
    }

    setBuyingId(operator.id);
    try {
      const { data } = await api.post('/activations/buy', {
        service_id: operator.service_id,
        country_id: operator.country_id,
        operator: operator.operator_name,
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
            <p className="text-sm text-gray-500">{allOperators.length} operators available across {prices.length} countries</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative w-full md:max-w-md">
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
            search
          </span>
          <input
            type="text"
            placeholder="Search by country, code, or operator..."
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

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="material-icons text-4xl text-gray-300 animate-spin">refresh</span>
        </div>
      ) : sortedOperators.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
          <span className="material-icons text-5xl text-gray-300 mb-4">public_off</span>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No operators found</h3>
          <p className="text-sm text-gray-400">
            {search ? `No results for "${search}"` : 'No operators available for this service'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {sortedOperators.map((op) => (
              <div key={op.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-2xl leading-none">{op.country_flag}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{op.country_name}</p>
                      <p className="text-xs text-gray-400 uppercase">{op.country_code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-gray-900">
                      ₦{Number(op.final_price).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">${op.cost_usd.toFixed(4)}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-gray-600">
                      {op.operator_name}
                    </label>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      op.stock_count > 0 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {op.stock_count > 0 ? `${op.stock_count} in stock` : 'Out of stock'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleBuy(op)}
                  disabled={buyingId === op.id || op.stock_count <= 0}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0f6df0] hover:bg-[#0d5ed9] disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  {buyingId === op.id ? (
                    <>
                      <span className="material-icons text-base animate-spin">refresh</span>
                      Processing
                    </>
                  ) : op.stock_count <= 0 ? (
                    <>
                      <span className="material-icons text-base">block</span>
                      Out of Stock
                    </>
                  ) : (
                    <>
                      <span className="material-icons text-base">bolt</span>
                      Buy Now
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Country
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Operator
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Price (NGN)
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Cost (USD)
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedOperators.map((op) => (
                  <tr key={op.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl leading-none">{op.country_flag}</span>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{op.country_name}</p>
                          <p className="text-xs text-gray-400 uppercase">{op.country_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                        {op.operator_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                        op.stock_count > 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {op.stock_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-base font-bold text-gray-900">
                        ₦{Number(op.final_price).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm text-gray-500 font-mono">
                        ${op.cost_usd.toFixed(4)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleBuy(op)}
                        disabled={buyingId === op.id || op.stock_count <= 0}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#0f6df0] hover:bg-[#0d5ed9] disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
                      >
                        {buyingId === op.id ? (
                          <>
                            <span className="material-icons text-base animate-spin">refresh</span>
                            Processing
                          </>
                        ) : op.stock_count <= 0 ? (
                          <>
                            <span className="material-icons text-base">block</span>
                          </>
                        ) : (
                          <>
                            <span className="material-icons text-base">bolt</span>
                            Buy
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
      <div className="max-w-6xl mx-auto pt-10 px-4">{content}</div>
    </div>
  );
}
