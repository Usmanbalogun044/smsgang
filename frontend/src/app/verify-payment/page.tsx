'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';

type VerifyState = 'waiting' | 'success' | 'failed' | 'support';
const MAX_VERIFY_ATTEMPTS = 2;

// Error codes from the backend that should stop retrying and escalate to support.
const TERMINAL_CODES = ['PROVIDER_INSUFFICIENT_BALANCE', 'ACTIVATION_PROVISIONING_FAILED'];

export default function VerifyPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = useMemo(
    () => {
      // Lendoverify appends ?paymentReference=... to our redirect URL.
      const raw =
        searchParams.get('paymentReference') ||
        searchParams.get('reference') ||
        searchParams.get('transactionReference') ||
        searchParams.get('trxref') ||
        '';

      // Some gateways accidentally append another query after the value; keep only the token.
      return raw.split('?')[0].trim();
    },
    [searchParams]
  );

  const [state, setState] = useState<VerifyState>('waiting');
  const [attempt, setAttempt] = useState(0);
  const [supportMsg, setSupportMsg] = useState('');

  useEffect(() => {
    if (!reference) {
      setState('failed');
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async (count: number) => {
      try {
        const verifyRes = await api.get(`/activations/verify/${encodeURIComponent(reference)}`);
        const activationId =
          verifyRes.data?.activation?.id ?? verifyRes.data?.order?.activation?.id;

        if (!cancelled) {
          setState('success');
          toast.success('Payment confirmed. Redirecting...');
          if (activationId) {
            setTimeout(() => router.push(`/activations/${activationId}`), 900);
          } else {
            setTimeout(() => router.push('/orders'), 900);
          }
        }
      } catch (err: any) {
        if (cancelled) return;

        const resData = err?.response?.data;
        const code = resData?.code as string | undefined;
        const status = err?.response?.status as number | undefined;

        // Already verified — redirect to activation.
        const activationId =
          resData?.activation?.id ?? resData?.order?.activation?.id;
        if (activationId) {
          setState('success');
          toast.success('Payment already verified. Redirecting...');
          setTimeout(() => router.push(`/activations/${activationId}`), 900);
          return;
        }

        // Terminal error codes — payment received but provisioning can't proceed.
        // Do NOT retry; tell the user to contact support.
        if (code && TERMINAL_CODES.includes(code)) {
          setSupportMsg(
            resData?.message ??
              'Your payment was received but we could not allocate a number. Please contact support.'
          );
          setState('support');
          return;
        }

        // 402: payment not confirmed yet — keep polling with a very small cap.
        if (status === 402 && count < MAX_VERIFY_ATTEMPTS - 1) {
          setAttempt(count + 1);
          timer = setTimeout(() => poll(count + 1), 3000);
          return;
        }

        // 422 ORDER_ALREADY_PROCESSED — payment done but something went sideways; support.
        if (code === 'ORDER_ALREADY_PROCESSED') {
          setSupportMsg(
            resData?.message ??
              'Your order is being processed. If no activation appears shortly, please contact support.'
          );
          setState('support');
          return;
        }

        // Any other error — retry briefly, then stop.
        if (count < MAX_VERIFY_ATTEMPTS - 1) {
          setAttempt(count + 1);
          timer = setTimeout(() => poll(count + 1), 3000);
          return;
        }

        setState('failed');
        toast.error('Could not verify payment. Please check your orders or contact support.');
      }
    };

    poll(0);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [reference, router]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 bg-[#f5f7f8]">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        {state === 'waiting' && (
          <>
            <div className="mx-auto mb-5 h-14 w-14 rounded-full border-4 border-[#0f6df0] border-t-transparent animate-spin" />
            <h1 className="text-xl font-bold text-slate-900">Verifying Payment</h1>
            <p className="mt-2 text-sm text-slate-500">Checking payment status with backend...</p>
            <p className="mt-3 text-xs text-slate-400">Attempt {attempt + 1} of {MAX_VERIFY_ATTEMPTS}</p>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-2xl font-black">✓</div>
            <h1 className="text-xl font-bold text-slate-900">Payment Verified</h1>
            <p className="mt-2 text-sm text-slate-500">Taking you to your activation...</p>
          </>
        )}

        {state === 'failed' && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-2xl font-black">!</div>
            <h1 className="text-xl font-bold text-slate-900">Still Processing</h1>
            <p className="mt-2 text-sm text-slate-500">We could not confirm payment yet. You can check your orders now.</p>
            <button
              onClick={() => router.push('/orders')}
              className="mt-5 w-full rounded-lg bg-[#0f6df0] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d5ed9]"
            >
              Go to Orders
            </button>
          </>
        )}

          {state === 'support' && (
            <>
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-3xl">⚠</div>
              <h1 className="text-xl font-bold text-slate-900">Action Required</h1>
              <p className="mt-2 text-sm text-slate-500">{supportMsg}</p>
              <p className="mt-3 text-xs text-slate-400">Your payment was received. Please contact support and we will resolve this quickly.</p>
              <button
                onClick={() => router.push('/orders')}
                className="mt-5 w-full rounded-lg bg-[#0f6df0] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d5ed9]"
              >
                View My Orders
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
