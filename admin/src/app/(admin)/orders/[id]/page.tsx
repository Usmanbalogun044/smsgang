'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Order } from '@/lib/types';

const statusTone: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-blue-100 text-blue-700',
  processing: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  expired: 'bg-slate-100 text-slate-600',
};

export default function AdminOrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;

    setLoading(true);
    api
      .get(`/admin/orders/${params.id}`)
      .then(({ data }) => setOrder(data.data ?? data))
      .catch(() => {
        toast.error('Failed to load order details');
        router.push('/orders');
      })
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const timeline = useMemo(() => {
    if (!order) return [];

    const base = [
      {
        title: 'Request Initialized',
        description: `User requested ${order.service?.name ?? 'service'} activation for ${order.country?.name ?? 'selected country'}.`,
        time: new Date(order.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    ];

    if (order.activation?.created_at) {
      base.push({
        title: 'Number Assigned',
        description: `Number ${order.activation.phone_number ?? 'not available'} assigned to session.`,
        time: new Date(order.activation.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
    }

    if (order.activation?.sms_code) {
      base.push({
        title: 'SMS Received',
        description: `Verification code delivered: ${order.activation.sms_code}`,
        time: new Date(order.activation.created_at ?? order.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
    }

    return base;
  }, [order]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7f8] p-8 dark:bg-[#101822]">
        <div className="mx-auto max-w-5xl space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-xl bg-white dark:bg-slate-900" />
          ))}
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-[#f5f7f8] p-4 text-slate-900 md:p-8 dark:bg-[#101822] dark:text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#0f6df0]">
              <span className="material-symbols-outlined text-sm">confirmation_number</span>
              Order ID
            </div>
            <h1 className="text-3xl font-black tracking-tight">SMS-{String(order.id).padStart(6, '0')}</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => toast('Force expire action can be wired to admin activation endpoint.', { icon: '⏳' })}
              className="flex items-center gap-2 rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-bold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <span className="material-symbols-outlined text-red-500">timer_off</span>
              Force Expire
            </button>
            <button
              onClick={() => toast('Refund action can be connected to your refund API endpoint.', { icon: '💸' })}
              className="flex items-center gap-2 rounded-xl bg-[#0f6df0] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-[#0f6df0]/25 transition hover:opacity-90"
            >
              <span className="material-symbols-outlined text-sm">undo</span>
              Refund Order
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <span className="material-symbols-outlined text-[#0f6df0]">person</span>
                <h3 className="font-bold">User Information</h3>
              </div>
              <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Full Name</p>
                  <p className="font-semibold">{order.user?.name ?? `User #${order.user_id}`}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email Address</p>
                  <p className="font-semibold">{order.user?.email ?? 'Not available'}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</p>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${statusTone[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {order.status}
                  </span>
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Payment Reference</p>
                  <p className="font-mono text-sm">{order.payment_reference ?? 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <span className="material-symbols-outlined text-[#0f6df0]">history</span>
                <h3 className="font-bold">Activation Lifecycle</h3>
              </div>
              <div className="space-y-4 p-6">
                {timeline.map((step) => (
                  <div key={step.title} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{step.title}</div>
                      <time className="text-xs font-medium text-[#0f6df0]">{step.time}</time>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{step.description}</p>
                  </div>
                ))}

                {timeline.length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No lifecycle events yet.</p>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <span className="material-symbols-outlined text-[#0f6df0]">payments</span>
                <h3 className="font-bold">Financial Summary</h3>
              </div>
              <div className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Provider Cost (RUB)</span>
                  <span className="font-semibold">N/A</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">System Markup</span>
                  <span className="rounded-full bg-[#0f6df0]/10 px-2 py-0.5 text-xs font-bold text-[#0f6df0]">Configured globally</span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-700" />
                <div className="flex items-center justify-between">
                  <span className="font-bold">Final Price (NGN)</span>
                  <span className="text-xl font-extrabold text-[#0f6df0]">₦{Number(order.price || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <span className="material-symbols-outlined text-[#0f6df0]">info</span>
                <h3 className="font-bold">Service Details</h3>
              </div>
              <div className="space-y-4 p-6">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Service</p>
                  <span className="font-semibold">{order.service?.name ?? 'N/A'}</span>
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Country</p>
                  <span className="font-semibold">{order.country?.name ?? 'N/A'} ({order.country?.code ?? '--'})</span>
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Provider</p>
                  <span className="font-semibold">{order.activation?.provider ?? 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <span className="material-symbols-outlined text-[#0f6df0]">terminal</span>
                <h3 className="font-bold">Gateway Log</h3>
              </div>
              <div className="overflow-x-auto bg-slate-900 p-4 font-mono text-[11px] leading-relaxed text-slate-300">
                <div className="text-green-400"># [{new Date(order.created_at).toLocaleTimeString('en-GB')}] REQUEST: create order</div>
                <div className="text-blue-400"># [{new Date(order.created_at).toLocaleTimeString('en-GB')}] RESPONSE: status={order.status}</div>
                <div className="text-yellow-400"># [{new Date(order.activation?.created_at ?? order.created_at).toLocaleTimeString('en-GB')}] ACTIVATION: id={order.activation?.id ?? 'N/A'}</div>
              </div>
            </div>
          </aside>
        </div>

        <button
          onClick={() => router.push('/orders')}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Orders
        </button>
      </div>
    </div>
  );
}
