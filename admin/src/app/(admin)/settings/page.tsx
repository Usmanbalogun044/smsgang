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
  // Activation services
  const [globalMarkup, setGlobalMarkup] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');

  // SMM services
  const [smmGlobalMarkupFixed, setSmmGlobalMarkupFixed] = useState('');
  const [smmGlobalMarkupType, setSmmGlobalMarkupType] = useState('fixed');

  const [initial, setInitial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'activation' | 'smm'>('activation');

  const [smmServices, setSmmServices] = useState<SmmService[]>([]);
  const [activationServices, setActivationServices] = useState<ServicePrice[]>([]);

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

      const snapshot = {
        global_markup: initial?.global_markup || '',
        exchange_rate: initial?.exchange_rate || '',
        smm_global_markup_fixed: String(fixed),
        smm_global_markup_type: smmGlobalMarkupType,
      };
      setInitial(snapshot);
      toast.success('SMM services settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
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

  const formatMoney = (value: number) =>
    `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-[#f5f7f8] dark:bg-[#101822]">
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-8">
        <div className="flex items-center gap-2 text-[#0f6df0]">
          <span className="material-symbols-outlined">tune</span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Service Settings</h2>
        </div>
      </header>

      <div className="px-8 py-6">
        <div className="mb-8">
          <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100">Global Service Settings</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Configure pricing and markup for all services</p>
        </div>

        {/* Tabs */}
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
              <span className="material-symbols-outlined text-base">phone</span>
              Activation Services (5sim)
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

        {/* Activation Services Tab */}
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
                        Exchange Rate (₦/USD)
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
                        Final = Service (USD) × {exchangeRate || '?'} × (1 + {globalMarkup || '0'}%)
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

        {/* SMM Services Tab */}
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
                        <option value="fixed">Fixed (₦ per 1,000 units)</option>
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
                          {smmGlobalMarkupType === 'fixed' ? '₦' : '%'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        Added to all SMM services based on CrestPanel's rate per 1,000 units.
                      </p>
                    </div>

                    <div className="bg-blue-50 dark:bg-[#0f6df0]/5 border border-blue-100 dark:border-[#0f6df0]/20 rounded-lg p-3">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">Formula:</p>
                      <p className="text-sm font-mono text-blue-600 dark:text-blue-400">
                        {smmGlobalMarkupType === 'fixed' 
                          ? 'Total = ((Rate + Fixed) / 1000) * Quantity' 
                          : 'Total = ((Rate * (1 + %)) / 1000) * Quantity'}
                      </p>
                    </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Final = CrestPanel Rate
                        {smmGlobalMarkupType === 'fixed' ? ` + ${smmGlobalMarkupFixed || '0'} ₦` : ` × (1 + ${smmGlobalMarkupFixed || '0'}%)`}
                      </p>
                    </div>
                  </div>
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
              </form>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">star</span>
                Services List
              </h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {smmServices.length === 0 ? (
                  <p className="text-sm text-slate-500">No SMM services found. Sync first.</p>
                ) : (
                  smmServices.map((service, idx) => (
                    <div
                      key={service.id}
                      className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded border border-slate-200 dark:border-slate-600 rounded text-xs space-y-1"
                    >
                      <div className="flex items-start justify-between">
                        <p className="font-bold text-slate-900 dark:text-white">{service.smm_service?.name}</p>
                        <span className="text-slate-400 bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded">#{idx + 1}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">CrestPanel Rate:</span> {formatMoney(service.smm_service?.rate || 0)} per 1,000
                      </p>
                      <p className="text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">Your Markup:</span> {service.markup_type === 'Fixed' ? formatMoney(service.markup_value) : `${service.markup_value}%`}
                      </p>
                      <p className="text-green-600 dark:text-green-400 font-bold">
                        Customer Pays: {formatMoney(service.final_price * 1000)} per 1,000
                      </p>
                      <p className="text-slate-400">Qty: {service.smm_service?.min} - {service.smm_service?.max}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
    }
