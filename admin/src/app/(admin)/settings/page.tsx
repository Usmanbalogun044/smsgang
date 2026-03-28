'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import useRealtimeRefresh from '@/hooks/useRealtimeRefresh';

interface SmmService {
  id: number;
  smm_service: {
    name: string;
    rate: number;
    min: number;
    max: number;
  };
  markup_type: string;
  markup_value: number;
  final_price: number;
}

interface ServicePrice {
  id: number;
  service: {
    name: string;
  };
  final_price: number;
}

export default function SettingsPage() {
  const [globalMarkup, setGlobalMarkup] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [smmGlobalMarkupFixed, setSmmGlobalMarkupFixed] = useState('');
  const [smmGlobalMarkupType, setSmmGlobalMarkupType] = useState('fixed');
  const [serviceMarkups, setServiceMarkups] = useState<Record<number, { type: string; value: string }>>({});
  const [initial, setInitial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingServiceId, setSavingServiceId] = useState<number | null>(null);
  const [tab, setTab] = useState<'activation' | 'smm'>('activation');
  const [smmServices, setSmmServices] = useState<SmmService[]>([]);
  const [activationServices, setActivationServices] = useState<ServicePrice[]>([]);

  const calculateFinalPrice = (baseRate: number, markupType: string, markupValue: number) => {
    if (markupType === 'percent') {
      return baseRate * (1 + markupValue / 100);
    } else {
      // baseRate is NGN per 1,000 units; fixed markup is also per 1,000 units
      return baseRate + markupValue;
    }
  };

  const normalizeMarkupType = (value: string | null | undefined) =>
    String(value || '').toLowerCase() === 'percent' ? 'percent' : 'fixed';

  const formatMoney = (value: number) =>
    `NGN ${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  useEffect(() => {
    Promise.all([
      api.get('/admin/settings'),
      api.get('/admin/smm/settings'),
      api.get<{ data: SmmService[] }>('/admin/smm/services?per_page=1000'),
      api.get<{ data: ServicePrice[] }>('/admin/services?per_page=1000'),
    ])
      .then(([activRes, smmRes, smmServRes, activServRes]) => {
        const snapshot = {
          global_markup: String(activRes.data.global_markup ?? ''),
          exchange_rate: String(activRes.data.exchange_rate ?? ''),
          smm_global_markup_fixed: String(smmRes.data.global_markup_fixed ?? '500'),
          smm_global_markup_type: smmRes.data.global_markup_type ?? 'fixed',
        };

        setGlobalMarkup(snapshot.global_markup);
        setExchangeRate(snapshot.exchange_rate);
        setSmmGlobalMarkupFixed(snapshot.smm_global_markup_fixed);
        setSmmGlobalMarkupType(snapshot.smm_global_markup_type);
        setInitial(snapshot);
        setSmmServices(smmServRes.data.data);
        setActivationServices(activServRes.data.data);

        const markups: Record<number, { type: string; value: string }> = {};
        smmServRes.data.data.forEach((svc) => {
          markups[svc.id] = {
            type: svc.markup_type || 'fixed',
            value: String(svc.markup_value || '0'),
          };
        });
        setServiceMarkups(markups);
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  useRealtimeRefresh(
    useCallback(() => {
      Promise.all([
        api.get('/admin/settings'),
        api.get('/admin/smm/settings'),
      ]).then(([activRes, smmRes]) => {
        const snapshot = {
          global_markup: String(activRes.data.global_markup ?? ''),
          exchange_rate: String(activRes.data.exchange_rate ?? ''),
          smm_global_markup_fixed: String(smmRes.data.global_markup_fixed ?? '500'),
          smm_global_markup_type: smmRes.data.global_markup_type ?? 'fixed',
        };
        setInitial(snapshot);
      });
    }, []),
    { enabled: saving === false && loading === false }
  );

  const handleSaveActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    const markup = Number(globalMarkup);
    const rate = Number(exchangeRate);

    if (!Number.isFinite(markup) || markup < 0) {
      toast.error('Markup must be a valid number');
      return;
    }

    if (!Number.isFinite(rate) || rate <= 0) {
      toast.error('Exchange rate must be greater than 0');
      return;
    }

    setSaving(true);
    try {
      await api.put('/admin/settings', {
        global_markup: markup,
        exchange_rate: rate,
      });

      const snapshot = {
        global_markup: String(markup),
        exchange_rate: String(rate),
        smm_global_markup_fixed: initial?.smm_global_markup_fixed || '500',
        smm_global_markup_type: initial?.smm_global_markup_type || 'fixed',
      };
      setInitial(snapshot);
      toast.success('Activation services settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSmm = async (e: React.FormEvent) => {
    e.preventDefault();
    const fixed = Number(smmGlobalMarkupFixed);

    if (!Number.isFinite(fixed) || fixed < 0) {
      toast.error('Markup must be a valid number');
      return;
    }

    setSaving(true);
    try {
      await api.put('/admin/smm/settings', {
        global_markup_fixed: fixed,
        global_markup_type: smmGlobalMarkupType,
      });

      // Refresh services list so admin sees updated final prices immediately.
      const smmServRes = await api.get<{ data: SmmService[] }>('/admin/smm/services?per_page=1000');
      setSmmServices(smmServRes.data.data);

      const markups: Record<number, { type: string; value: string }> = {};
      smmServRes.data.data.forEach((svc) => {
        markups[svc.id] = {
          type: normalizeMarkupType(svc.markup_type),
          value: String(svc.markup_value || '0'),
        };
      });
      setServiceMarkups(markups);

      // Kick off provider sync in background so new/changed services also follow latest settings.
      api.post('/admin/smm/services/sync').catch(() => {
        // Sync is best-effort here; pricing refresh above already updated existing rows.
      });

      const snapshot = {
        global_markup: initial?.global_markup || '',
        exchange_rate: initial?.exchange_rate || '',
        smm_global_markup_fixed: String(fixed),
        smm_global_markup_type: smmGlobalMarkupType,
      };
      setInitial(snapshot);
      toast.success('SMM services settings saved and applied');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveServiceMarkup = async (service: SmmService) => {
    const draft = serviceMarkups[service.id] || { type: service.markup_type, value: String(service.markup_value) };
    const markupValue = Number(draft.value);

    if (!Number.isFinite(markupValue) || markupValue < 0) {
      toast.error('Service markup must be a valid number');
      return;
    }

    setSavingServiceId(service.id);
    try {
      const normalizedType = normalizeMarkupType(draft.type);
      const backendType = normalizedType === 'percent' ? 'Percent' : 'Fixed';

      await api.put(`/admin/smm/services/${service.id}/markup`, {
        markup_type: backendType,
        markup_value: markupValue,
      });

      setSmmServices((prev) =>
        prev.map((item) =>
          item.id === service.id
            ? {
                ...item,
                markup_type: normalizedType,
                markup_value: markupValue,
                final_price: calculateFinalPrice(item.smm_service?.rate || 0, normalizedType, markupValue),
              }
            : item
        )
      );

      toast.success('Service markup saved');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save service markup');
    } finally {
      setSavingServiceId(null);
    }
  };

  const hasActivationChanges = useMemo(() => {
    if (!initial) return false;
    return (
      globalMarkup !== initial.global_markup ||
      exchangeRate !== initial.exchange_rate
    );
  }, [globalMarkup, exchangeRate, initial]);

  const hasSmmChanges = useMemo(() => {
    if (!initial) return false;
    return (
      smmGlobalMarkupFixed !== initial.smm_global_markup_fixed ||
      smmGlobalMarkupType !== initial.smm_global_markup_type
    );
  }, [smmGlobalMarkupFixed, smmGlobalMarkupType, initial]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-3xl text-[#0f6df0]">tune</span>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white">Service Settings</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">Manage pricing, markups, and per-service gains</p>
        </div>

        <div className="flex gap-4 mb-8 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setTab('activation')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
              tab === 'activation'
                ? 'border-[#0f6df0] text-[#0f6df0]'
                : 'border-transparent text-slate-600 dark:text-slate-400'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">credit_card</span>
              Activation Services (5SIM)
            </span>
          </button>
          <button
            onClick={() => setTab('smm')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
              tab === 'smm'
                ? 'border-[#0f6df0] text-[#0f6df0]'
                : 'border-transparent text-slate-600 dark:text-slate-400'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">trending_up</span>
              SMM Services (CrestPanel)
            </span>
          </button>
        </div>

        {tab === 'activation' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
              <form onSubmit={handleSaveActivation} className="space-y-6 p-6">
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Price Configuration</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Global Markup (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={globalMarkup}
                        onChange={(e) => setGlobalMarkup(e.target.value)}
                        disabled={loading}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0f6df0] outline-none"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        Percentage added to all activation services
                      </p>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Exchange Rate (NGN/USD)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(e.target.value)}
                        disabled={loading}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0f6df0] outline-none"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        How many Naira equals 1 USD
                      </p>
                    </div>
                    <div className="bg-blue-50 dark:bg-[#0f6df0]/5 border border-blue-100 dark:border-[#0f6df0]/20 rounded-lg p-3">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">Formula:</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Final = Service (USD) ?? {exchangeRate || '?'} ?? (1 + {globalMarkup || '0'}%)
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 border-t border-slate-200 dark:border-slate-700 pt-4">
                  <button
                    type="submit"
                    disabled={saving || loading || !hasActivationChanges}
                    className="flex-1 bg-[#0f6df0] hover:bg-[#0d5ed9] text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined ${saving ? 'animate-spin' : ''}`}>
                      {saving ? 'refresh' : 'save'}
                    </span>
                    Save
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Services</h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activationServices.length === 0 ? (
                  <p className="text-sm text-slate-500">No services found</p>
                ) : (
                  activationServices.map((service) => (
                    <div key={service.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded border border-slate-200 dark:border-slate-600">
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">{service.service?.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Final Price: {formatMoney(service.final_price)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'smm' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
              <form onSubmit={handleSaveSmm} className="space-y-6 p-6">
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Global Configuration</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Markup Type
                      </label>
                      <select
                        value={smmGlobalMarkupType}
                        onChange={(e) => setSmmGlobalMarkupType(e.target.value)}
                        disabled={loading}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0f6df0] outline-none"
                      >
                        <option value="fixed">Fixed (NGN per 1,000 units)</option>
                        <option value="percent">Percentage (%)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        {smmGlobalMarkupType === 'fixed' ? 'Fixed Amount (per 1,000 units)' : 'Percentage (%)'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step={smmGlobalMarkupType === 'fixed' ? '1' : '0.1'}
                          value={smmGlobalMarkupFixed}
                          onChange={(e) => setSmmGlobalMarkupFixed(e.target.value)}
                          disabled={loading}
                          className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0f6df0] outline-none"
                        />
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                          {smmGlobalMarkupType === 'fixed' ? 'NGN' : '%'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        Global markup for all SMM services
                      </p>
                    </div>
                    <div className="flex gap-2 border-t border-slate-200 dark:border-slate-700 pt-4">
                      <button
                        type="submit"
                        disabled={saving || loading || !hasSmmChanges}
                        className="flex-1 bg-[#0f6df0] hover:bg-[#0d5ed9] text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                      >
                        <span className={`material-symbols-outlined ${saving ? 'animate-spin' : ''}`}>
                          {saving ? 'refresh' : 'save'}
                        </span>
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined">star</span>
                  SMM Services Table
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">5SIM-style display with inline markup controls</p>
              </div>

              <div className="max-h-[32rem] overflow-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Service</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Base /1k</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Qty Range</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Markup</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Customer /1k</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {smmServices.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No SMM services found. Sync first.</td>
                      </tr>
                    )}

                    {smmServices.map((service) => (
                      <tr key={service.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900 dark:text-white text-sm leading-tight">{service.smm_service?.name}</p>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {formatMoney(service.smm_service?.rate || 0)}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {service.smm_service?.min}-{service.smm_service?.max}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex gap-2 items-center">
                            <select
                              value={serviceMarkups[service.id]?.type || 'fixed'}
                              onChange={(e) => {
                                setServiceMarkups({
                                  ...serviceMarkups,
                                  [service.id]: {
                                    ...serviceMarkups[service.id],
                                    type: e.target.value,
                                  },
                                });
                              }}
                              className="w-24 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                            >
                              <option value="fixed">Fixed</option>
                              <option value="percent">%</option>
                            </select>
                            <input
                              type="number"
                              min="0"
                              step={serviceMarkups[service.id]?.type === 'fixed' ? '1' : '0.1'}
                              value={serviceMarkups[service.id]?.value || '0'}
                              onChange={(e) => {
                                setServiceMarkups({
                                  ...serviceMarkups,
                                  [service.id]: {
                                    ...serviceMarkups[service.id],
                                    value: e.target.value,
                                  },
                                });
                              }}
                              placeholder="0"
                              className="w-28 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                            />
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 min-w-8">
                              {serviceMarkups[service.id]?.type === 'fixed' ? 'NGN' : '%'}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {formatMoney(
                              calculateFinalPrice(
                                service.smm_service?.rate || 0,
                                serviceMarkups[service.id]?.type || 'fixed',
                                Number(serviceMarkups[service.id]?.value || '0')
                              )
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleSaveServiceMarkup(service)}
                            disabled={savingServiceId === service.id || loading}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded bg-[#0f6df0] text-white hover:bg-[#0d5ed9] disabled:opacity-60 transition-colors"
                          >
                            <span className={`material-symbols-outlined text-sm ${savingServiceId === service.id ? 'animate-spin' : ''}`}>
                              {savingServiceId === service.id ? 'refresh' : 'save'}
                            </span>
                            {savingServiceId === service.id ? 'Saving...' : 'Save'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
