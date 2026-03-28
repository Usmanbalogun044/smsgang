'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import useRealtimeRefresh from '@/hooks/useRealtimeRefresh';
import DashboardSidebar from '@/components/DashboardSidebar';
import type { SmmService, SmmServicePrice, PaginatedResponse } from '@/lib/types';

interface ServiceMetadata {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export default function SmmServicesPage() {
  const [services, setServices] = useState<(SmmServicePrice & { smm_service: SmmService })[]>([]);
  const [meta, setMeta] = useState<ServiceMetadata>({ current_page: 1, last_page: 1, per_page: 50, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [selectedService, setSelectedService] = useState<(SmmServicePrice & { smm_service: SmmService }) | null>(null);
  const [quantity, setQuantity] = useState('');
  const [orderLink, setOrderLink] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [walletBalance, setWalletBalance] = useState('0.00');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [page, setPage] = useState(1);

  const sanitizeCategories = (input: string[]) =>
    input
      .map((c) => String(c || '').trim())
      .filter((c) => c.length > 0 && /[a-z0-9]/i.test(c));

  const formatMoney = (value: number) =>
    `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getServiceDetails = (item: any) => item?.smm_service ?? item?.service ?? item ?? {};

  const getFinalPrice = (item: any) => {
    if (typeof item?.final_price === 'number') return item.final_price;
    if (typeof item?.rate_per_unit === 'number') return item.rate_per_unit;
    if (typeof item?.final_price_ngn === 'number') return item.final_price_ngn;
    return 0;
  };

  const getTotalCost = (item: any, qty: number) => {
    const unitPrice = getFinalPrice(item);
    return unitPrice * Math.max(0, qty);
  };

  const filteredServices = useMemo(
    () => services.filter((s) => 
      getServiceDetails(s).name.toLowerCase().includes(search.toLowerCase())
    ),
    [services, search],
  );

  const loadWalletBalance = useCallback(() => {
    api
      .get<{ balance: number }>('/wallet/balance')
      .then(({ data }) => setWalletBalance(String(data.balance)))
      .catch(() => {
        // Silently fail for wallet balance
      });
  }, []);

  const loadServices = useCallback((currentPage = 1, silent = false) => {
    if (!silent) setLoading(true);

    const params = new URLSearchParams({ 
      page: String(currentPage), 
      per_page: '50' 
    });
    if (search) params.append('search', search);
    if (category) params.append('category', category);

    api
      .get<PaginatedResponse<SmmServicePrice & { smm_service: SmmService }>>(`/smm/services?${params.toString()}`)
      .then(({ data }) => {
        setServices(Array.isArray(data.data) ? data.data : []);
        
        const paginationData = (data as any).pagination || (data as any).meta || {};
        setMeta({
          current_page: paginationData.current_page || currentPage,
          last_page: paginationData.last_page || 1,
          per_page: paginationData.per_page || 50,
          total: paginationData.total || 0
        });

        const responseCategories = Array.isArray((data as any).categories)
          ? sanitizeCategories((data as any).categories)
          : [];
        const cats = responseCategories.length > 0
          ? responseCategories
          : sanitizeCategories([...new Set(
              (Array.isArray(data.data) ? data.data : [])
                .map((s: any) => s?.smm_service?.category ?? s?.category)
                .filter(Boolean)
            )] as string[]);
        setCategories(cats as string[]);
      })
      .catch((error) => {
        if (!silent) {
          console.error('Failed to load SMM services:', error);
          toast.error('Failed to load SMM services');
        }
        setServices([]);
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, [search, category]);

  useEffect(() => {
    loadWalletBalance();
  }, [loadWalletBalance]);

  useEffect(() => {
    setPage(1);
    loadServices(1, false);
  }, [search, category, loadServices]);

  useRealtimeRefresh(
    useCallback(() => {
      loadServices(page, true);
      loadWalletBalance();
    }, [loadServices, page, loadWalletBalance]),
    { intervalMs: 3600000 }
  );

  const handleCreateOrder = async () => {
    if (!selectedService || !quantity || !orderLink.trim()) {
      toast.error('Please provide your link and quantity');
      return;
    }

    const details = getServiceDetails(selectedService);
    const qty = parseInt(quantity);
    const minQty = Number(details?.min ?? 0);
    const maxQty = Number(details?.max ?? Number.MAX_SAFE_INTEGER);
    if (qty < minQty || qty > maxQty) {
      toast.error(`Quantity must be between ${minQty} and ${maxQty}`);
      return;
    }

    const serviceId = Number(details?.id ?? selectedService.smm_service_id ?? 0);
    if (!serviceId) {
      toast.error('Unable to create order for this service. Please refresh and try again.');
      return;
    }

    const totalCost = getTotalCost(selectedService, qty);
    if (Number(walletBalance) < totalCost) {
      toast.error(`Insufficient balance. You need ${formatMoney(totalCost)} but have ${formatMoney(Number(walletBalance))}`);
      return;
    }

    setSubmittingOrder(true);
    try {
      await api.post('/smm/orders', {
        smm_service_id: serviceId,
        link: orderLink.trim(),
        quantity: qty,
      });

      toast.success('Order placed successfully');
      setSelectedService(null);
      setQuantity('');
      setOrderLink('');
      loadWalletBalance();
      loadServices(page, true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to place order');
    } finally {
      setSubmittingOrder(false);
    }
  };

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
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-100 rounded-lg">
              <span className="material-symbols-outlined text-slate-500" style={{ fontSize: 18 }}>wallet</span>
              <span className="text-sm font-semibold text-slate-900">{formatMoney(Number(walletBalance || 0))}</span>
            </div>
          </div>
        </header>

        {/* ── Scrollable content ─── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f5f7f8]">
          {/* Header & Filters */}
          <div className="mb-8">
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Boost Your Social Media</h2>
                  <p className="text-slate-600">Choose services to grow your accounts instantly with transparent per-1,000 pricing.</p>
                </div>
                <button
                  onClick={() => loadServices(page)}
                  className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  <span className="material-symbols-outlined text-base">refresh</span>
                  Refresh
                </button>
              </div>
            </div>

            {/* Category Filter */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 md:p-4">
              <div className="md:hidden">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0f6df0]/30 focus:border-[#0f6df0] text-sm"
                >
                  <option value="">All categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="hidden md:flex flex-col md:flex-row md:items-center gap-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 md:min-w-28">
                  Category
                </label>
                <div className="flex-1 flex gap-2">
                  <input
                    list="smm-category-options"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="All categories (type to search...)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0f6df0]/30 focus:border-[#0f6df0] text-sm"
                  />
                  <datalist id="smm-category-options">
                    {categories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                  <button
                    onClick={() => setCategory('')}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold"
                  >
                    All
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Services Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 h-56 animate-pulse" />
              ))}
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-4">not_interested</span>
              <p className="text-slate-500 text-lg">No services found</p>
              <p className="text-slate-400 text-sm mt-1">Try adjusting your search or category filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
              {filteredServices.map((service) => {
                const details = getServiceDetails(service);
                const finalPrice = getFinalPrice(service);
                const isSelected = selectedService?.id === service.id;

                return (
                  <button
                    key={service.id}
                    onClick={() => { setSelectedService(service); setQuantity(''); setOrderLink(''); }}
                    className={`p-5 rounded-2xl border-2 text-left transition-all transform hover:scale-105 ${
                      isSelected
                        ? 'border-[#0f6df0] bg-[#0f6df0]/5 shadow-lg shadow-[#0f6df0]/10 ring-1 ring-[#0f6df0]'
                        : 'border-slate-200 bg-white hover:border-[#0f6df0] hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-bold text-slate-900 line-clamp-2 text-sm">
                          {details?.name || 'Unknown Service'}
                        </p>
                      </div>
                      {isSelected && (
                        <span className="material-symbols-outlined text-[#0f6df0] text-2xl flex-shrink-0 ml-2">check_circle</span>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div className="bg-slate-50 rounded-lg p-2.5">
                        <p className="text-xs text-slate-500 mb-0.5 font-semibold">Category</p>
                        <p className="text-xs font-bold text-slate-700">
                          {details?.category || 'N/A'}
                        </p>
                      </div>
                      
                      <div className="bg-slate-50 rounded-lg p-2.5">
                        <p className="text-xs text-slate-500 mb-0.5 font-semibold">Qty Range</p>
                        <p className="text-xs font-bold text-slate-700">
                          {details?.min || '—'} - {details?.max || '—'} units
                        </p>
                      </div>

                      <div className="border-t border-slate-200 pt-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1 font-semibold">Price per 1,000 Units</p>
                        <p className="text-2xl font-black text-[#0f6df0] leading-none">
                          {formatMoney(finalPrice * 1000)}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">Per unit: {formatMoney(finalPrice)}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {meta.last_page > 1 && (
            <div className="flex justify-center gap-2 mt-12">
              <button
                onClick={() => {
                  const newPage = Math.max(1, page - 1);
                  setPage(newPage);
                  loadServices(newPage);
                }}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors font-medium"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, meta.last_page) }).map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => {
                      setPage(pageNum);
                      loadServices(pageNum);
                    }}
                    className={`px-3 py-2 rounded-lg transition-colors font-medium text-sm ${
                      page === pageNum
                        ? 'bg-[#0f6df0] text-white'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => {
                  const newPage = Math.min(meta.last_page || 1, page + 1);
                  setPage(newPage);
                  loadServices(newPage);
                }}
                disabled={page === (meta.last_page || 1)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors font-medium"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Order Modal */}
      {selectedService && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900">
                  {getServiceDetails(selectedService)?.name || 'Service'}
                </h2>
                <p className="text-slate-600 mt-2 text-sm">
                  Available Qty: {getServiceDetails(selectedService)?.min || '—'} - {getServiceDetails(selectedService)?.max || '—'} units
                </p>
              </div>
              <button
                onClick={() => { setSelectedService(null); setQuantity(''); setOrderLink(''); }}
                className="text-slate-400 hover:text-slate-600 ml-4 p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Price Box */}
            <div className="bg-gradient-to-br from-[#0f6df0]/10 via-blue-50 to-cyan-50 p-5 rounded-xl border border-[#0f6df0]/20">
              <p className="text-xs text-slate-600 mb-2 font-semibold uppercase tracking-wide">Price per 1,000 Units</p>
              <p className="text-3xl font-bold text-[#0f6df0]">
                {formatMoney(getFinalPrice(selectedService) * 1000)}
              </p>
              <p className="text-xs text-slate-500 mt-3">
                Total = (Price ÷ 1,000) × Quantity
              </p>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">link</span>
                    Link / Username
                  </span>
                </label>
                <input
                  type="url"
                  value={orderLink}
                  onChange={(e) => setOrderLink(e.target.value)}
                  placeholder="https://example.com/post/123"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f6df0]/30 focus:border-[#0f6df0] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">format_list_numbered</span>
                    Quantity
                  </span>
                </label>
                <input
                  type="number"
                  min={getServiceDetails(selectedService)?.min || 0}
                  max={getServiceDetails(selectedService)?.max || 999999}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={`Min: ${getServiceDetails(selectedService)?.min || '—'}`}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f6df0]/30 focus:border-[#0f6df0] transition-all"
                />
              </div>
            </div>

            {/* Cost Summary */}
            {quantity && getFinalPrice(selectedService) ? (
              <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-slate-600 font-medium">Total Cost</span>
                  <span className="font-bold text-lg text-slate-900">
                    {formatMoney(getTotalCost(selectedService, Number(quantity)))}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Wallet Balance</span>
                  <span className={`font-bold ${Number(walletBalance) >= getTotalCost(selectedService, Number(quantity)) ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatMoney(Number(walletBalance))}
                  </span>
                </div>
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setSelectedService(null); setQuantity(''); setOrderLink(''); }}
                className="flex-1 px-4 py-3 rounded-lg border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={!quantity || !orderLink.trim() || submittingOrder}
                className="flex-1 px-4 py-3 rounded-lg bg-[#0f6df0] text-white font-bold hover:bg-[#0d5ed9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">{submittingOrder ? 'refresh' : 'shopping_cart'}</span>
                {submittingOrder ? 'Placing...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
