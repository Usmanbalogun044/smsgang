'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Order } from '@/lib/types';

const STATUS_LABEL: Record<string, { text: string; tone: string; icon: string }> = {
  pending: { text: 'Pending Payment', tone: 'bg-amber-100 text-amber-700', icon: 'schedule' },
  paid: { text: 'Paid', tone: 'bg-blue-100 text-blue-700', icon: 'payments' },
  processing: { text: 'Processing', tone: 'bg-indigo-100 text-indigo-700', icon: 'autorenew' },
  completed: { text: 'Completed', tone: 'bg-green-100 text-green-700', icon: 'check_circle' },
  failed: { text: 'Failed', tone: 'bg-red-100 text-red-700', icon: 'error' },
  expired: { text: 'Expired', tone: 'bg-slate-100 text-slate-600', icon: 'timer_off' },
};

export default function UserOrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;

    setLoading(true);
    api
      .get(`/orders/${params.id}`)
      .then(({ data }) => setOrder(data.data ?? data))
      .catch(() => {
        toast.error('Unable to load order details');
        router.push('/orders');
      })
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const copyPhoneNumber = async () => {
    if (!order?.activation?.phone_number) {
      toast.error('No phone number available yet');
      return;
    }

    try {
      await navigator.clipboard.writeText(order.activation.phone_number);
      toast.success('Phone number copied');
    } catch {
      toast.error('Failed to copy number');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f6f6] p-6">
        <div className="mx-auto max-w-[560px] space-y-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-xl bg-white" />
          ))}
        </div>
      </div>
    );
  }

  if (!order) return null;

  const status = STATUS_LABEL[order.status] ?? {
    text: order.status,
    tone: 'bg-slate-100 text-slate-600',
    icon: 'info',
  };

  return (
    <div className="min-h-screen bg-[#f8f6f6] px-4 py-6 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[560px] flex-col rounded-2xl border border-slate-200 bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/orders')}
              className="rounded-full p-1 transition hover:bg-slate-100"
              aria-label="Back to orders"
            >
              <span className="material-symbols-outlined text-slate-600">arrow_back</span>
            </button>
            <h2 className="text-xl font-bold tracking-tight">Order Details</h2>
          </div>
          <button
            onClick={() => router.push('/orders')}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 transition hover:bg-slate-200"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-slate-600">close</span>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="bg-slate-50 px-6 py-8 text-center">
            <div className="relative mx-auto mb-4 flex w-fit items-center justify-center">
              <div className="rounded-full bg-[#0f6df0]/10 p-4 ring-4 ring-white">
                <span className="material-symbols-outlined text-5xl text-[#0f6df0]">chat</span>
              </div>
              <div className="absolute bottom-0 right-0 h-5 w-5 rounded-full border-2 border-white bg-green-500" />
            </div>
            <h1 className="text-2xl font-extrabold">{order.service?.name ?? 'Activation'}</h1>
            <p className="font-medium text-slate-500">Order #SMS-{String(order.id).padStart(6, '0')}</p>
            <div className={`mx-auto mt-4 flex w-fit items-center gap-1 rounded-full px-4 py-1.5 text-sm font-bold ${status.tone}`}>
              <span className="material-symbols-outlined text-sm">{status.icon}</span>
              {status.text}
            </div>
          </div>

          <div className="space-y-1 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 py-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">public</span>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Country</p>
              </div>
              <p className="font-semibold">{order.country?.name ?? 'N/A'}</p>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 py-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">call</span>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Phone Number</p>
              </div>
              <p className="text-lg font-bold">{order.activation?.phone_number ?? 'Not assigned'}</p>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 py-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#0f6df0]">sms</span>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">SMS Code</p>
              </div>
              <div className="rounded-lg bg-[#0f6df0]/10 px-3 py-1">
                <p className="text-lg font-black tracking-[0.18em] text-[#0f6df0]">{order.activation?.sms_code ?? '------'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 py-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">payments</span>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Price Paid</p>
              </div>
              <p className="text-lg font-semibold">₦ {Number(order.price || 0).toLocaleString()}</p>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 py-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">receipt_long</span>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Reference</p>
              </div>
              <p className="font-mono text-sm text-slate-600">{order.payment_reference ?? 'N/A'}</p>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 py-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">calendar_today</span>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Timestamp</p>
              </div>
              <p className="font-medium">
                {new Date(order.created_at).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          <div className="space-y-3 p-6">
            <button
              onClick={copyPhoneNumber}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#0f6df0] text-base font-bold text-white shadow-lg shadow-[#0f6df0]/20 transition hover:bg-[#0d5ed9]"
            >
              <span className="material-symbols-outlined">content_copy</span>
              Copy Phone Number
            </button>
            <button
              onClick={() => router.push('/orders')}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 text-base font-bold text-slate-700 transition hover:bg-slate-200"
            >
              <span className="material-symbols-outlined">history</span>
              Back to History
            </button>
          </div>
        </main>

        <footer className="border-t border-slate-100 p-6 text-center text-xs italic text-slate-400">
          If you have not received an SMS within 20 minutes, the transaction may be cancelled and refunded automatically.
        </footer>
      </div>
    </div>
  );
}
