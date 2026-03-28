'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';
import DashboardSidebar from '@/components/DashboardSidebar';

export default function FundWalletPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [amount, setAmount] = useState<string | number>('');
  const [submitting, setSubmitting] = useState(false);

  const MIN_AMOUNT = 500;
  const formatMoney = (value: number) =>
    `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers
    if (value === '' || /^\d+(\.\d{0,2})?$/.test(value)) {
      setAmount(value);
    }
  };

  const amountNum = typeof amount === 'string' ? (amount ? parseFloat(amount) : 0) : amount;
  const isValid = amountNum >= MIN_AMOUNT;

  const handleFundWallet = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      toast.error(`Amount must be at least ${formatMoney(MIN_AMOUNT)}`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/wallet/fund', {
        amount: amountNum,
      });

      // Check if there's a payment gateway link
      const paymentUrl =
        response.data?.payment_gateway_link ||
        response.data?.checkout_url ||
        response.data?.paystack_authorization_url ||
        response.data?.payment_url;

      if (paymentUrl) {
        // Redirect to payment gateway
        window.location.href = paymentUrl;
      } else {
        toast.success(`Wallet funded with ${formatMoney(amountNum)}!`);
        setTimeout(() => router.push('/transactions'), 2000);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; error?: string } } };
      toast.error(e.response?.data?.message || e.response?.data?.error || 'Failed to process funding request');
    } finally {
      setSubmitting(false);
    }
  };

  const quickAmounts = [1000, 2500, 5000, 10000];

  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f7f8]">
        <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">refresh</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f7f8]">
      <DashboardSidebar mobileOpen={sidebarOpen} setMobileOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Fund Your Wallet</h2>
              <p className="text-sm text-slate-600 mt-1">Add funds to your account to purchase services</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">Funding wallet</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-[#0f6df0]/20 flex items-center justify-center text-[#0f6df0] font-bold border-2 border-[#0f6df0]/10 text-xl overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-6 lg:p-8 space-y-8">
            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="text-[#0f6df0] text-2xl mb-2">
                  <span className="material-symbols-outlined text-3xl">info</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Minimum Amount</h3>
                <p className="text-slate-600 text-sm">You can fund your wallet with a minimum of {formatMoney(MIN_AMOUNT)}</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="text-emerald-600 text-2xl mb-2">
                  <span className="material-symbols-outlined text-3xl">check_circle</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Instant Processing</h3>
                <p className="text-slate-600 text-sm">Funds are added to your wallet immediately after payment confirmation</p>
              </div>
            </div>

            {/* Funding Form */}
            <form onSubmit={handleFundWallet} className="bg-white rounded-2xl p-8 shadow-lg space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">How much do you want to fund?</label>
                
                <div className="relative mb-6">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">₦</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={handleAmountChange}
                    className="w-full pl-10 pr-4 py-4 text-2xl font-bold rounded-xl border-2 border-slate-200 focus:border-[#0f6df0] focus:ring-2 focus:ring-[#0f6df0]/20 outline-none transition-all"
                  />
                </div>

                {amount && (
                  <div className={`p-4 rounded-lg ${isValid ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                    <p className={`text-sm font-semibold ${isValid ? 'text-emerald-700' : 'text-red-700'}`}>
                      {isValid
                        ? `✓ Amount is valid. You'll be adding ${formatMoney(amountNum)} to your wallet.`
                        : `✗ Minimum amount is ${formatMoney(MIN_AMOUNT)}`}
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Amount Buttons */}
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Or choose a quick amount</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {quickAmounts.map((quickAmount) => (
                    <button
                      key={quickAmount}
                      type="button"
                      onClick={() => setAmount(quickAmount.toString())}
                      className={`p-4 rounded-xl font-bold border-2 transition-all ${
                        amountNum === quickAmount
                          ? 'border-[#0f6df0] bg-[#0f6df0]/10 text-[#0f6df0]'
                          : 'border-slate-200 bg-slate-50 text-slate-900 hover:border-[#0f6df0] hover:bg-[#0f6df0]/5'
                      }`}
                    >
                      {formatMoney(quickAmount)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isValid || submitting}
                className="w-full px-6 py-4 bg-gradient-to-r from-[#0f6df0] to-blue-600 text-white font-bold rounded-xl hover:shadow-lg hover:from-[#0d5ed9] hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">{submitting ? 'refresh' : 'account_balance_wallet'}</span>
                {submitting ? 'Processing...' : `Fund Wallet with ${formatMoney(amountNum) || '₦0.00'}`}
              </button>

              <p className="text-xs text-slate-500 text-center">
                All transactions are secure and processed through our payment partners. Your information is encrypted and protected.
              </p>
            </form>

            {/* Payment Methods Info */}
            <div className="bg-white rounded-2xl p-8 shadow-lg space-y-4">
              <h3 className="font-bold text-slate-900 text-lg">Accepted Payment Methods</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                  <span className="material-symbols-outlined text-[#0f6df0]">credit_card</span>
                  <span className="font-semibold text-slate-700">Debit Card</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                  <span className="material-symbols-outlined text-[#0f6df0]">payment</span>
                  <span className="font-semibold text-slate-700">Bank Transfer</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                  <span className="material-symbols-outlined text-[#0f6df0]">phone_iphone</span>
                  <span className="font-semibold text-slate-700">Mobile Money</span>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-blue-50 rounded-2xl p-8 border border-blue-200 space-y-4">
              <h3 className="font-bold text-slate-900 text-lg">Frequently Asked Questions</h3>
              
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">When will my funds be available?</h4>
                <p className="text-slate-600 text-sm">Funds are processed instantly after successful payment. In rare cases, it may take up to 5 minutes.</p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Can I withdraw wallet funds?</h4>
                <p className="text-slate-600 text-sm">No. User wallets are for purchasing services only. Withdrawals are not available.</p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Is there a maximum amount I can fund?</h4>
                <p className="text-slate-600 text-sm">No, there's no maximum limit. You can fund any amount you need for your services.</p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-2">What if my transaction fails?</h4>
                <p className="text-slate-600 text-sm">If your transaction fails, your card won't be charged. You'll see an error message explaining why. Please try again or contact support.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
