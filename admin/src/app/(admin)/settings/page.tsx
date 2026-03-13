'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

type SettingsSnapshot = {
  global_markup: string;
  exchange_rate: string;
};

export default function SettingsPage() {
  const [globalMarkup, setGlobalMarkup] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [initial, setInitial] = useState<SettingsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/admin/settings')
      .then(({ data }) => {
        const snapshot = {
          global_markup: String(data.global_markup ?? ''),
          exchange_rate: String(data.exchange_rate ?? ''),
        };

        setGlobalMarkup(snapshot.global_markup);
        setExchangeRate(snapshot.exchange_rate);
        setInitial(snapshot);
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const hasChanges = useMemo(() => {
    if (!initial) return false;

    return (
      globalMarkup !== initial.global_markup ||
      exchangeRate !== initial.exchange_rate
    );
  }, [globalMarkup, exchangeRate, initial]);

  const handleDiscard = () => {
    if (!initial) return;
    setGlobalMarkup(initial.global_markup);
    setExchangeRate(initial.exchange_rate);
    toast('Changes discarded', { icon: '↩' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const markup = Number(globalMarkup);
    const rate = Number(exchangeRate);

    if (!Number.isFinite(markup) || markup < 0) {
      toast.error('Global markup must be a valid non-negative number');
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
      };

      setInitial(snapshot);
      setGlobalMarkup(snapshot.global_markup);
      setExchangeRate(snapshot.exchange_rate);
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const previewPrice =
    exchangeRate && globalMarkup
      ? (0.1 * Number(exchangeRate) + Number(globalMarkup)).toFixed(2)
      : null;

  return (
    <div className="min-h-screen bg-[#f5f7f8] dark:bg-[#101822]">
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-8">
        <div className="flex items-center gap-2 text-[#0f6df0]">
          <span className="material-symbols-outlined">settings</span>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Global Settings</h2>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
          </button>
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </header>

      <div className="px-8 py-6">
        <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
          <span>Admin</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-slate-900 dark:text-slate-100 font-medium">Settings</span>
        </nav>

        <div>
          <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Global Settings</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Configure system-wide financial parameters, currency exchange rates, and transaction markups for all regions.
          </p>
        </div>
      </div>

      <div className="px-8 pb-12 flex-1 overflow-y-auto">
        <div className="max-w-4xl space-y-8">
          <form onSubmit={handleSave}>
            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <span className="material-symbols-outlined text-[#0f6df0]">payments</span>
                  Financial Configuration
                </h4>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-900 dark:text-slate-100">Global Markup (Fixed NGN)</label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Set a flat fee markup applied to every activation transaction.
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <div className="relative max-w-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-500 font-medium">N</span>
                      </div>

                      <input
                        className="block w-full pl-8 pr-12 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#0f6df0] focus:border-transparent transition-all outline-none"
                        placeholder="0.00"
                        type="number"
                        min="0"
                        step="0.01"
                        value={globalMarkup}
                        onChange={(e) => setGlobalMarkup(e.target.value)}
                        disabled={loading}
                        required
                      />

                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-xs text-slate-400 font-bold">NGN</span>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-900 dark:text-slate-100">USD to NGN Exchange Rate</label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Specify the current conversion rate for United States Dollar to Nigerian Naira.
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center gap-4 max-w-sm">
                      <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-slate-500 font-medium">1 USD =</span>
                        </div>

                        <input
                          className="block w-full pl-16 pr-12 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#0f6df0] focus:border-transparent transition-all outline-none"
                          placeholder="0.00"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={exchangeRate}
                          onChange={(e) => setExchangeRate(e.target.value)}
                          disabled={loading}
                          required
                        />

                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-xs text-slate-400 font-bold">NGN</span>
                        </div>
                      </div>

                      <div className="bg-[#0f6df0]/5 p-2 rounded-lg border border-[#0f6df0]/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#0f6df0] text-xl">sync</span>
                      </div>
                    </div>

                    <p className="text-[10px] mt-2 text-slate-400 italic">Used in final price calculation instantly after save.</p>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-[#0f6df0]/5 border border-blue-100 dark:border-[#0f6df0]/20 rounded-xl p-4">
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-bold">Formula Preview:</span>{' '}
                    Final Price = (5SIM cost x {exchangeRate || '?'}) + {globalMarkup || '?'}
                    {' -> '}
                    <span className="font-bold text-slate-900 dark:text-slate-100">{previewPrice ? `N${previewPrice}` : 'N?'}</span>
                  </p>
                </div>
              </div>

              <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={!hasChanges || saving || loading}
                  className="px-6 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Discard Changes
                </button>

                <button
                  type="submit"
                  disabled={saving || loading || !hasChanges}
                  className="bg-[#0f6df0] hover:bg-[#0d5ed9] text-white px-8 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-[#0f6df0]/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className={`material-symbols-outlined text-sm ${saving ? 'animate-spin' : ''}`}>
                    {saving ? 'refresh' : 'save'}
                  </span>
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </section>
          </form>

          <div className="bg-blue-50 dark:bg-[#0f6df0]/5 border border-blue-100 dark:border-[#0f6df0]/20 rounded-xl p-6 flex gap-4">
            <span className="material-symbols-outlined text-[#0f6df0]">info</span>
            <div>
              <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100">Audit Notice</h5>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Changing these settings will immediately affect all pending and future transactions. Every update is logged in the system for security and auditing purposes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
