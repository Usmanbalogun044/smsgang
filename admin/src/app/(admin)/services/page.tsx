'use client';

import { useEffect, useState, FormEvent } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import type { Service, PaginatedResponse } from '@/lib/types';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 50, total: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', slug: '', provider_service_code: '', is_active: true });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const fetchServices = (page = 1) => {
    setLoading(true);
    api.get<PaginatedResponse<Service>>(`/admin/services?page=${page}&search=${search}`)
      .then(({ data }) => { 
        setServices(data.data); 
        setMeta(data.meta); 
      })
      .catch(() => toast.error('Failed to load services'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { 
    const timer = setTimeout(() => fetchServices(1), 300);
    return () => clearTimeout(timer);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post('/admin/services/sync');
      toast.success(data.message);
      fetchServices();
    } catch { toast.error('Sync failed'); }
    finally { setSyncing(false); }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/admin/services/${editingId}`, formData);
        toast.success('Service updated');
      } else {
        await api.post('/admin/services', formData);
        toast.success('Service created');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', slug: '', provider_service_code: '', is_active: true });
      fetchServices(meta.current_page);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to save');
    }
  };

  const startEdit = (service: Service) => {
    setFormData({ name: service.name, slug: service.slug, provider_service_code: service.provider_service_code, is_active: service.is_active });
    setEditingId(service.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleActive = async (service: Service) => {
    try {
      await api.put(`/admin/services/${service.id}`, { is_active: !service.is_active });
      setServices(services.map(s => s.id === service.id ? { ...s, is_active: !s.is_active } : s));
      toast.success(`Service ${!service.is_active ? 'activated' : 'deactivated'}`);
    } catch { toast.error('Failed to update'); }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', slug: '', provider_service_code: '', is_active: true });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Manage Services</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Add, edit or sync SMS services from provider</p>
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
            <span>{showForm ? 'Cancel' : 'New Service'}</span>
          </button>
        </div>
      </header>

      {/* Form Area */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-bold mb-6">{editingId ? 'Edit Service' : 'Add New Service'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Service Name</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder="e.g. WhatsApp"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Slug (Optional)</label>
              <input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder="whatsapp"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Provider Code</label>
              <input
                value={formData.provider_service_code}
                onChange={(e) => setFormData({ ...formData, provider_service_code: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder="e.g. wa"
                required
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
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Service is enabled</span>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="px-6 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                >
                  {editingId ? 'Save Changes' : 'Create Service'}
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
              placeholder="Search services..."
              type="text"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Showing {services.length} of {meta.total} services
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Slug</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12">
                    <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm font-medium">Loading services...</p>
                    </div>
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No services found matching your search.
                  </td>
                </tr>
              ) : (
                services.map((service) => (
                  <tr key={service.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">#{service.id}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{service.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[10px] font-bold uppercase">
                        {service.provider_service_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">{service.slug}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <button
                          onClick={() => toggleActive(service)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                            service.is_active
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                          }`}
                        >
                          {service.is_active ? 'Active' : 'Disabled'}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(service)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Edit Service"
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
              onPageChange={(page) => fetchServices(page)} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
