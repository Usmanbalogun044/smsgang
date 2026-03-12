'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { Activation } from '@/lib/types';

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
  waiting_sms: 'bg-blue-100 text-blue-800',
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

  // Poll for SMS updates
  useEffect(() => {
    if (!activation) return;
    const terminal = ['completed', 'expired', 'cancelled', 'sms_received'];
    if (terminal.includes(activation.status)) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/activations/${id}`);
        setActivation(data.data);
        if (data.data.sms_code) {
          toast.success('SMS code received!');
        }
      } catch {
        // silent
      }
    }, 3000);

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

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!activation) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Activation not found.</p>
      </div>
    );
  }

  const isTerminal = ['completed', 'expired', 'cancelled'].includes(activation.status);
  const canCancel = ['requested', 'number_received', 'waiting_sms'].includes(activation.status);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Activation Details</h1>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Status Bar */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[activation.status] || 'bg-gray-100'}`}>
            {statusLabels[activation.status] || activation.status}
          </span>
          <CountdownTimer expiresAt={activation.expires_at} />
        </div>

        <div className="p-6 space-y-6">
          {/* Service & Country */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Service</p>
              <p className="font-medium text-gray-900">{activation.service?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Country</p>
              <p className="font-medium text-gray-900">
                {activation.country?.flag} {activation.country?.name}
              </p>
            </div>
          </div>

          {/* Phone Number */}
          {activation.phone_number && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Phone Number</p>
              <div className="flex items-center gap-3">
                <code className="text-2xl font-mono font-bold text-gray-900 bg-gray-50 px-4 py-3 rounded-lg flex-1">
                  {activation.phone_number}
                </code>
                <button
                  onClick={() => handleCopy(activation.phone_number)}
                  className="bg-gray-100 hover:bg-gray-200 px-4 py-3 rounded-lg text-sm font-medium transition"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* SMS Code */}
          {activation.sms_code ? (
            <div>
              <p className="text-sm text-gray-500 mb-2">SMS Code</p>
              <div className="flex items-center gap-3">
                <code className="text-3xl font-mono font-bold text-green-600 bg-green-50 px-4 py-3 rounded-lg flex-1 text-center">
                  {activation.sms_code}
                </code>
                <button
                  onClick={() => handleCopy(activation.sms_code!)}
                  className="bg-green-100 hover:bg-green-200 px-4 py-3 rounded-lg text-sm font-medium transition text-green-800"
                >
                  Copy
                </button>
              </div>
            </div>
          ) : !isTerminal ? (
            <div className="text-center py-6 bg-blue-50 rounded-lg">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-blue-700 font-medium">Waiting for SMS code...</p>
              <p className="text-xs text-blue-500 mt-1">Polling automatically every 3 seconds</p>
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {!isTerminal && (
              <button
                onClick={handleCheckSms}
                className="flex-1 border border-indigo-300 text-indigo-600 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-50 transition"
              >
                Check SMS Now
              </button>
            )}
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 border border-red-300 text-red-600 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Activation'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
