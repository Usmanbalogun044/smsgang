'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

function InputField({
  label, hint, prefix, type = 'number', value, onChange, min, step, required,
}: {
  label: string; hint?: string; prefix?: string; type?: string;
  value: string; onChange: (v: string) => void;
  min?: string; step?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</label>
      {hint && <p className="text-xs text-slate-600 mb-3 leading-relaxed">{hint}</p>}
      <div className="relative">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-semibold select-none">{prefix}</span>
        )}
        <input
          type={type}
          min={min}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className={`w-full ${prefix ? 'pl-12' : 'pl-4'} pr-4 py-3 bg-[#0d1022] border border-[#1e2235] rounded-xl text-slate-200 placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all text-sm`}
        />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [globalMarkup, setGlobalMarkup] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/settings').then(({ data }) => {
      setGlobalMarkup(String(data.global_markup));
      setExchangeRate(String(data.exchange_rate));
    }).catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/admin/settings', {
        global_markup: parseFloat(globalMarkup),
        exchange_rate: parseFloat(exchangeRate),
      });
      toast.success('Settings saved!');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const previewPrice = exchangeRate && globalMarkup
    ? (5 * parseFloat(exchangeRate) + parseFloat(globalMarkup)).toFixed(2)
    : null;

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <div className="w-40 h-7 bg-white/5 rounded animate-pulse mb-2" />
          <div className="w-72 h-4 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="max-w-xl space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-[#111424] rounded-2xl border border-[#1e2235] p-6 animate-pulse">
              <div className="w-32 h-4 bg-white/5 rounded mb-3" />
              <div className="w-full h-11 bg-white/5 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Pricing Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Set your profit margin and exchange rate — applies to <span className="text-slate-300 font-medium">all services</span> automatically.
        </p>
      </div>

      <div className="max-w-xl">
        <form onSubmit={handleSave}>
          <div className="bg-[#111424] rounded-2xl border border-[#1e2235] p-6 space-y-6 mb-4">
            <InputField
              label="Profit Per Activation (₦)"
              hint="Flat NGN amount added on top of the 5SIM base price for every activation. E.g. 100 = ₦100 profit per sale."
              prefix="₦"
              value={globalMarkup}
              onChange={setGlobalMarkup}
              min="0"
              step="0.01"
              required
            />
            <InputField
              label="Exchange Rate (₦ per 1 RUB)"
              hint="5SIM prices are in Rubles. This converts them to NGN before adding your markup. Check xe.com for the current rate."
              prefix="RUB→₦"
              value={exchangeRate}
              onChange={setExchangeRate}
              min="0.01"
              step="0.01"
              required
            />
          </div>

          {/* Formula preview */}
          <div className="bg-indigo-500/[0.08] border border-indigo-500/20 rounded-2xl p-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              <p className="text-sm font-semibold text-indigo-300">Price Formula</p>
            </div>
            <p className="font-mono text-xs text-slate-400 mb-2">
              Final Price = (5SIM cost × <span className="text-indigo-400">{exchangeRate || '?'}</span>) + ₦<span className="text-emerald-400">{globalMarkup || '?'}</span>
            </p>
            <p className="text-xs text-slate-500">
              Example: 5SIM cost = 5 RUB →{' '}
              (5 × {exchangeRate || '?'}) + {globalMarkup || '?'} ={' '}
              <span className="text-white font-semibold">{previewPrice ? `₦${previewPrice}` : '₦?'}</span>
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Saving...
              </span>
            ) : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
