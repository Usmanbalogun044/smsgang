'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function VerifyPaymentPage() {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref') || '';

    api.post(`/activations/${id}/verify-payment`, { reference })
      .then(({ data }) => {
        setStatus('success');
        toast.success('Payment verified! Number purchased.');
        const activation = data.activation ?? data.data?.activation;
        if (activation) {
          setTimeout(() => router.push(`/activations/${activation.id}`), 1500);
        }
      })
      .catch((err) => {
        setStatus('failed');
        toast.error(err.response?.data?.message || 'Payment verification failed');
      });
  }, [id, router]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {status === 'verifying' && (
          <>
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Verifying Payment</h1>
            <p className="text-gray-600">Please wait while we confirm your payment...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">✓</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600">Redirecting to your activation...</p>
          </>
        )}
        {status === 'failed' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">✗</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Payment Failed</h1>
            <p className="text-gray-600 mb-6">Something went wrong. Please try again.</p>
            <button
              onClick={() => router.push('/services')}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              Back to Services
            </button>
          </>
        )}
      </div>
    </div>
  );
}
