'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { Activation } from '@/lib/types';
import DashboardSidebar from '@/components/DashboardSidebar';

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const min = Math.floor(diff / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${min}:${sec.toString().padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const isExpired = timeLeft === 'Expired';

  return (
    <span className={`text-2xl font-mono font-bold ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
      {timeLeft}
    </span>
  );
}

const statusColors: Record<string, string> = {
  requested: 'bg-yellow-100 text-yellow-800',
  number_received: 'bg-blue-100 text-blue-800',
  waiting_sms: 'bg-indigo-100 text-indigo-800',
  sms_received: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<string, string> = {
  requested: 'Requested',
  number_received: 'Number Received',
  waiting_sms: 'Waiting for SMS',
  sms_received: 'SMS Received',
  completed: 'Completed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export default function ActivationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activation, setActivation] = useState<Activation | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchActivation = useCallback(async () => {
    try {
      const { data } = await api.get(`/activations/${id}`);
      setActivation(data.data);
    } catch {
      toast.error('Failed to load activation');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchActivation();
  }, [fetchActivation]);

  // Poll for SMS updates every 1.5 seconds for real-time delivery
  useEffect(() => {
    if (!activation) return;
    const terminal = ['completed', 'expired', 'cancelled', 'sms_received'];
    if (terminal.includes(activation.status)) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/activations/${id}`);
        // Only update if status changed or sms received to avoid flickering? 
        // Actually react handles diffing well.
        if (data.data.sms_code && !activation.sms_code) {
          toast.success('SMS code received!');
        }
        setActivation(data.data);
      } catch {
        // silent
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activation, id]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancel = async () => {
    if (!activation) return;
    setCancelling(true);
    try {
      await api.post(`/activations/${activation.id}/cancel`);
      toast.success('Activation cancelled');
      fetchActivation();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Cancel failed');
    } finally {
      setCancelling(false);
    }
  };

  const handleCheckSms = async () => {
    try {
        const { data } = await api.get(`/activations/${id}/check-sms`);
        setActivation(data.data);
        if (data.data.sms_code) {
          toast.success('SMS code found!');
        } else {
          toast('No SMS yet, keep waiting...', { icon: '⏳' });
        }
      } catch {
        toast.error('Check failed');
      }
  };

  // Determine content based on state
  const isTerminal = activation ? ['completed', 'expired', 'cancelled'].includes(activation.status) : false;
  const canCancel = activation ? ['requested', 'number_received', 'waiting_sms'].includes(activation.status) : false;

  const renderContent = () => {
    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-4 shadow-sm animate-pulse">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-8 bg-gray-100 rounded" />
                ))}
            </div>
        );
    }

    if (!activation) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">error</span>
                <p className="text-gray-500">Activation not found.</p>
                <Link href="/services" className="mt-4 inline-block text-[#0f6df0] hover:underline font-medium">
                    Go back to services
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Status Bar */}
            <div className="bg-gray-50 px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 gap-4">
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider ${statusColors[activation.status] || 'bg-gray-100'}`}>
                        {statusLabels[activation.status] || activation.status}
                    </span>
                    {activation.status === 'sms_received' && (
                        <span className="text-green-600 flex items-center gap-1 text-sm font-bold">
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                            Success
                        </span>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-[10px] uppercase text-slate-400 font-bold mb-1 md:hidden">Time Remaining</p>
                    <CountdownTimer expiresAt={activation.expires_at} />
                </div>
            </div>

            <div className="p-4 md:p-6 space-y-6">
                {/* Service & Country */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">Service</p>
                        <p className="font-bold text-slate-900 flex items-center gap-2">
                             <span className="material-symbols-outlined text-slate-400">apps</span>
                             {activation.service?.name}
                        </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">Country</p>
                        <p className="font-bold text-slate-900 flex items-center gap-2">
                            <span className="text-lg">{activation.country?.flag}</span>
                            {activation.country?.name}
                        </p>
                    </div>
                </div>

                {/* Phone Number */}
                {activation.phone_number && (
                    <div>
                        <p className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400">phone_iphone</span>
                            Phone Number
                        </p>
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="relative flex-1 group">
                                <code className="block w-full text-xl md:text-2xl font-mono font-bold text-slate-900 bg-slate-100 px-4 py-3 rounded-xl border border-slate-200 group-hover:bg-slate-50 transition-colors text-center md:text-left">
                                    {activation.phone_number}
                                </code>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-slate-300">content_copy</span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleCopy(activation.phone_number)}
                                className="h-full aspect-square md:aspect-auto md:px-6 bg-[#0f6df0] hover:bg-[#0d5ed9] text-white rounded-xl font-bold transition shadow-lg shadow-[#0f6df0]/20 flex items-center justify-center active:scale-95"
                                style={{ height: '54px' }}
                            >
                                <span className="material-symbols-outlined md:hidden">content_copy</span>
                                <span className="hidden md:inline">{copied ? 'Copied!' : 'Copy'}</span>
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                            Use this number to register on {activation.service?.name}. 
                        </p>
                    </div>
                )}

                {/* SMS Code */}
                <div>
                   <p className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400">sms</span>
                        Verification Code
                   </p>
                   
                   {activation.sms_code ? (
                        <div className="flex items-center gap-2 md:gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex-1 relative">
                                <code className="block w-full text-3xl md:text-4xl font-mono font-black text-green-600 bg-green-50 px-4 py-4 rounded-xl border border-green-200 text-center tracking-widest shadow-sm">
                                    {activation.sms_code}
                                </code>
                            </div>
                            <button
                                onClick={() => handleCopy(activation.sms_code!)}
                                className="h-full aspect-square md:aspect-auto md:px-6 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition shadow-lg shadow-green-600/20 flex items-center justify-center active:scale-95"
                                style={{ height: '70px' }}
                            >
                                <span className="material-symbols-outlined md:hidden">content_copy</span>
                                <span className="hidden md:inline">Copy</span>
                            </button>
                        </div>
                    ) : !isTerminal ? (
                        <div className="text-center py-8 bg-indigo-50/50 rounded-xl border-2 border-dashed border-indigo-200">
                            <div className="relative mx-auto mb-4 w-12 h-12">
                                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
                                <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-indigo-500" style={{ fontSize: '20px' }}>
                                    sms
                                </span>
                            </div>
                            <p className="text-indigo-900 font-bold animate-pulse">Waiting for SMS...</p>
                            <p className="text-xs text-indigo-500 mt-1 font-medium">Live-checking every 1.5s</p>
                        </div>
                    ) : (
                        <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200">
                            <span className="material-symbols-outlined text-slate-300 text-3xl mb-2">cancel</span>
                            <p className="text-slate-500">No code received</p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-slate-100">
                    {!isTerminal && (
                        <button
                            onClick={handleCheckSms}
                            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">refresh</span>
                            Force Check
                        </button>
                    )}
                    {canCancel && (
                        <button
                            onClick={handleCancel}
                            disabled={cancelling}
                            className="flex-1 py-3 px-4 rounded-xl bg-red-50 text-red-600 border border-red-100 font-semibold hover:bg-red-100 hover:border-red-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {cancelling ? <span className="material-symbols-outlined animate-spin">refresh</span> : <span className="material-symbols-outlined">block</span>}
                            {cancelling ? 'Cancelling...' : 'Cancel Activation'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f7f8]">
        {/* Sidebar */}
        <DashboardSidebar mobileOpen={sidebarOpen} setMobileOpen={setSidebarOpen} />
        
        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden w-full relative h-[100dvh]">
             {/* Header */}
             <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-20">
                <div className="flex items-center gap-3">
                   <button 
                       className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                       onClick={() => setSidebarOpen(true)}
                   >
                       <span className="material-symbols-outlined">menu</span>
                   </button>
                   <Link href="/services" className="flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors group">
                       <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
                       <span className="hidden md:inline text-sm font-medium">Back to Services</span>
                   </Link>
                </div>
                <h1 className="text-sm md:text-lg font-bold text-slate-900 truncate max-w-[150px] md:max-w-none">
                   {loading ? 'Loading...' : `Activation #${id}`}
                </h1>
                <div className="w-8" /> 
             </header>
 
             {/* Scrollable Area */}
             <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f5f7f8]">
                <div className="max-w-2xl mx-auto pb-20 md:pb-0">
                    {renderContent()}
                </div>
             </div>
        </main>
    </div>
  );
}
