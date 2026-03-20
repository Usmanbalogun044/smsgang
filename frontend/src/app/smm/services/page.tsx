'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import useRealtimeRefresh from '@/hooks/useRealtimeRefresh';
import DashboardSidebar from '@/components/DashboardSidebar';
import type { SmmService, SmmServicePrice, PaginatedResponse } from '@/lib/types';

export default function SmmServicesPage() {
  const [services, setServices] = useState<(SmmServicePrice & { smm_service: SmmService })[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 50, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [selectedService, setSelectedService] = useState<(SmmServicePrice & { smm_service: SmmService }) | null>(null);
  const [quantity, setQuantity] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [walletBalance, setWalletBalance] = useState('0.00');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const formatMoney = (value: number) =>
    `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const loadWalletBalance = useCallback(() => {
    api
      .get<{ balance: number }>('/wallet/balance')
      .then(({ data }) => setWalletBalance(String(data.balance)))
      .catch(() => toast.error('Failed to load wallet balance'));
  }, []);

  const loadServices = useCallback((page = 1, silent = false) => {
    if (!silent) setLoading(true);

    const params = new URLSearchParams({ page: String(page), per_page: '50' });
    if (search) params.append('search', search);
    if (category) params.append('category', category);

    api
      .get<PaginatedResponse<SmmServicePrice & { smm_service: SmmService }>>(`/smm/services?${params.toString()}`)
      .then(({ data }) => {
        setServices(data.data);
        // Handle both 'pagination' and 'meta' response formats
        const paginationData = (data as any).pagination || (data as any).meta || {};
        setMeta(paginationData);
        
        const cats = [...new Set(data.data.map(s => s.smm_service?.category).filter(Boolean))];
        setCategories(cats as string[]);
      })
      .catch(() => {
        if (!silent) toast.error('Failed to load SMM services');
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, [search, category]);

  useEffect(() => {
    loadWalletBalance();
    const timer = setTimeout(() => loadServices(1), 300);
    return () => clearTimeout(timer);
  }, [search, category, loadWalletBalance, loadServices]);

  useRealtimeRefresh(
    useCallback(() => {
      loadServices(meta.current_page, true);
      loadWalletBalance();
    }, [loadServices, meta.current_page, loadWalletBalance]),
    { intervalMs: 3600000 }
  );

  const handleCreateOrder = async () => {
    if (!selectedService || !quantity) {
      toast.error('Please select a service and enter quantity');
      return;
    }

    const qty = parseInt(quantity);
    if (qty < selectedService.smm_service.min || qty > selectedService.smm_service.max) {
      toast.error(`Quantity must be between ${selectedService.smm_service.min} and ${selectedService.smm_service.max}`);
      return;
    }

    router.push(`/smm/orders/create?serviceId=${selectedService.smm_service.id}&quantity=${qty}`);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f7f8]">
      <DashboardSidebar mobileOpen={sidebarOpen} setMobileOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input
                  type="text"
                  placeholder="Search services by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

          {/* Services Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
              ))
            ) : services.length === 0 ? (
              <div className="col-span-full text-center text-slate-500 py-12">No services found</div>
            ) : (
              services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => { setSelectedService(service); setQuantity(''); }}
                  className={`p-6 rounded-lg border-2 text-center transition-all cursor-pointer hover:shadow-lg ${
                    selectedService?.id === service.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-lg'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300'
                  }`}
                >
                  {selectedService?.id === service.id && (
                    <div className="absolute top-2 right-2">
                      <span className="material-symbols-outlined text-blue-500">check_circle</span>
                    </div>
                  )}
                  <p className="text-lg font-bold text-slate-900 dark:text-white line-clamp-2">
                    {service.smm_service?.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">Auto-detect</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                    Qty Range: {service.smm_service?.min} - {service.smm_service?.max}
                  </p>
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                      Price (per 1 unit)
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {formatMoney(service.final_price)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Pagination */}
          {meta.last_page > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={meta.current_page}
                lastPage={meta.last_page}
                onPageChange={(page) => loadServices(page)}
              />
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Order Modal */}
      {selectedService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedService.smm_service?.name}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">
                  Qty Range: {selectedService.smm_service?.min} - {selectedService.smm_service?.max} units
                </p>
              </div>
              <button
                onClick={() => { setSelectedService(null); setQuantity(''); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="bg-blue-50 dark:bg-slate-700 p-4 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">Price per Unit (₦)</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {formatMoney(selectedService.final_price)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                You will be charged this amount multiplied by the quantity you enter
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Quantity
              </label>
              <input
                type="number"
                min={selectedService.smm_service?.min}
                max={selectedService.smm_service?.max}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={`Min: ${selectedService.smm_service?.min}, Max: ${selectedService.smm_service?.max}`}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {quantity && (
              <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-600 dark:text-slate-300">
                    {quantity} × {formatMoney(selectedService.final_price)}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatMoney(Number(quantity) * selectedService.final_price)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => { setSelectedService(null); setQuantity(''); }}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrder}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
              >
                Order Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

