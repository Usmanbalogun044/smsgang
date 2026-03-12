'use client';

import { useEffect, useState, FormEvent } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import type { Country, PaginatedResponse } from '@/lib/types';

export default function CountriesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 100, total: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', flag: '', is_active: true });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const fetchCountries = (page = 1) => {
    setLoading(true);
    api.get<PaginatedResponse<Country>>(`/admin/countries?page=${page}&search=${search}`)
      .then(({ data }) => { 
        setCountries(data.data); 
        setMeta(data.meta); 
      })
      .catch(() => toast.error('Failed to load countries'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { 
    const timer = setTimeout(() => fetchCountries(1), 300);
    return () => clearTimeout(timer);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post('/admin/countries/sync');
      toast.success(data.message);
      fetchCountries();
    } catch { toast.error('Sync failed'); }
    finally { setSyncing(false); }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, flag: formData.flag || null };
      if (editingId) {
        await api.put(`/admin/countries/${editingId}`, payload);
        toast.success('Country updated');
      } else {
        await api.post('/admin/countries', payload);
        toast.success('Country created');
      }
      cancel();
      fetchCountries(meta.current_page);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to save');
    }
  };

  const startEdit = (country: Country) => {
    setFormData({ name: country.name, code: country.code, flag: country.flag || '', is_active: country.is_active });
    setEditingId(country.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', code: '', flag: '', is_active: true });
  };

  const toggleActive = async (country: Country) => {
    try {
      await api.put(`/admin/countries/${country.id}`, { is_active: !country.is_active });
      setCountries(countries.map(c => c.id === country.id ? { ...c, is_active: !c.is_active } : c));
      toast.success(`Country ${!country.is_active ? 'activated' : 'deactivated'}`);
    } catch { toast.error('Failed to update'); }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Manage Countries</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Available locations for SMS verification</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <span className={`material-symbols-outlined ${syncing ? 'animate-spin' : ''}`}>sync</span>
            <span>{syncing ? 'Syncing...' : 'Sync 5SIM'}</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-shadow shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined">{showForm ? 'close' : 'add'}</span>
            <span>{showForm ? 'Cancel' : 'Add Country'}</span>
          </button>
        </div>
      </header>

      {/* Form Area */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-bold mb-6">{editingId ? 'Edit Country' : 'Add New Country'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Country Name</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder="e.g. Nigeria"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">ISO Code</label>
              <input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none text-center font-bold"
                placeholder="NG"
                required
                maxLength={5}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Flag (Emoji or PNG URL)</label>
              <input
                value={formData.flag}
                onChange={(e) => setFormData({ ...formData, flag: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder="????????"
              />
            </div>
            <div className="md:col-span-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${formData.is_active ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.is_active ? 'left-7' : 'left-1'}`} />
                </button>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Country is active</span>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={cancel}
                  className="px-6 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                >
                  {editingId ? 'Save Changes' : 'Create Country'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Main Table Area */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              placeholder="Search countries..."
              type="text"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Showing {countries.length} of {meta.total} countries
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">Country</th>
                <th className="px-6 py-4">ISO Code</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12">
                    <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm font-medium">Loading countries...</p>
                    </div>
                  </td>
                </tr>
              ) : countries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No countries found.
                  </td>
                </tr>
              ) : (
                countries.map((country) => (
                  <tr key={country.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded text-lg">
                          {country.flag ? (
                            country.flag.startsWith('http') ? (
                              <img src={country.flag} alt={country.name} className="w-6 h-4 object-cover" />
                            ) : (
                              country.flag
                            )
                          ) : '???????'}
                        </div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{country.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[10px] font-bold uppercase leading-tight tracking-wider">
                        {country.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <button
                          onClick={() => toggleActive(country)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                            country.is_active
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                          }`}
                        >
                          {country.is_active ? 'Active' : 'Disabled'}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(country)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Edit Country"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta.last_page > 1 && (
          <div className="p-6 border-t border-slate-200 dark:border-slate-800">
            <Pagination 
              currentPage={meta.current_page} 
              lastPage={meta.last_page} 
              onPageChange={(page) => fetchCountries(page)} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
