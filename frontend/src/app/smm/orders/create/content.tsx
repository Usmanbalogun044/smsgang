'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { SmmService, SmmServicePrice } from '@/lib/types';

export default function CreateSmmOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get('serviceId');
  const quantity = searchParams.get('quantity');

  const [service, setService] = useState<any>(null);
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [balance, setBalance] = useState(0);

  const formatMoney = (value: number) =>
    `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  useEffect(() => {
    if (!serviceId || !quantity) {
      router.push('/smm/services');
      return;
    }

    Promise.all([
      api.get<any>(`/smm/services/${serviceId}`),
      api.get<{ balance: number }>('/wallet/balance'),
    ])
      .then(([serviceRes, balanceRes]) => {
        setService(serviceRes.data);
        setBalance(balanceRes.data.balance);
      })
      .catch(() => {
        toast.error('Failed to load service details');
        router.push('/smm/services');
      })
      .finally(() => setLoading(false));
  }, [serviceId, quantity, router]);

  const handleCreateOrder = async () => {
    if (!link) {
      toast.error('Please enter the link/URL');
      return;
    }

    if (!service) {
      toast.error('Service not loaded');
      return;
    }

    const qty = parseInt(quantity || '0');
    const totalCost = service.rate_per_unit * Math.max(0, qty);

    if (balance < totalCost) {
      toast.error(`Insufficient balance. You need ${formatMoney(totalCost)} but only have ${formatMoney(balance)}`);
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/smm/orders', {
        smm_service_id: service.id,
        link,
        quantity: qty,
      });

      toast.success('Order created successfully!');
      router.push('/smm/orders');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500">Service not found</p>
      </div>
    );
  }

  const totalCost = service.rate_per_unit * Math.max(0, parseInt(quantity || '0') || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 sm:p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <button onClick={() => router.back()} className="mb-8 text-blue-600 hover:underline font-semibold">
          ← Back
        </button>

        {/* Order Form */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg space-y-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Create SMM Order</h1>

          {/* Service Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-2">{service.name}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-600 dark:text-slate-400">Quantity</p>
                <p className="font-bold text-slate-900 dark:text-white">{quantity}</p>
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400">Rate (per 1k)</p>
                <p className="font-bold text-slate-900 dark:text-white">{formatMoney(service.rate_per_unit * 1000)}</p>
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400">Total Cost</p>
                <p className="font-bold text-blue-600">{formatMoney(totalCost)}</p>
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400">Your Balance</p>
                <p className={`font-bold ${balance >= totalCost ? 'text-green-600' : 'text-red-600'}`}>
                  {formatMoney(balance)}
                </p>
              </div>
            </div>
          </div>

          {/* Link Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Your Link/URL
            </label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://example.com/post/123 or @username"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Enter the exact link or username where you want the service delivered
            </p>
          </div>

          {/* Terms Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" className="mt-1" />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              I acknowledge this order will deduct {formatMoney(totalCost)} from my wallet and cannot be refunded once started
            </span>
          </label>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateOrder}
              disabled={submitting || balance < totalCost}
              className="flex-1 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-slate-400 transition-colors"
            >
              {submitting ? 'Creating...' : `Confirm & Place Order`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
