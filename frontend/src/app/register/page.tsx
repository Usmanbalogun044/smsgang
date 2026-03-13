'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/register', { 
        name, 
        email, 
        password,
        password_confirmation: passwordConfirmation 
      });
      setAuth(data.user, data.token);
      toast.success('Account created!');
      router.push('/activations');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f5f7f8]">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 w-[480px] flex-shrink-0 bg-[#0f6df0]">
        <Link href="/" className="flex items-center gap-3">
          <div className="size-9 bg-white/20 rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-2xl">sms</span>
          </div>
          <span className="text-xl font-bold text-white">SMSGang</span>
        </Link>

        <div>
          <h2 className="text-4xl font-black text-white mb-4 leading-tight tracking-tight">
            Join 50,000+<br />users getting<br />verified fast
          </h2>
          <p className="text-blue-100 text-base mb-10">
            Setup takes less than a minute. No credit card required.
          </p>
          <div className="space-y-4">
            {[
              'Free account — start immediately',
              'Wallet top-up via bank transfer or card',
              '24/7 support for all your activations',
            ].map((t) => (
              <div key={t} className="flex items-center gap-3 text-white">
                <div className="size-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-white" style={{ fontSize: 14 }}>check</span>
                </div>
                <span className="text-sm font-medium">{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { stat: '300+', label: 'Apps' },
            { stat: '150+', label: 'Countries' },
            { stat: '50K+', label: 'Users' },
          ].map(({ stat, label }) => (
            <div key={label} className="bg-white/10 rounded-xl p-3 border border-white/20 text-center">
              <p className="text-white font-black text-xl">{stat}</p>
              <p className="text-blue-200 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <p className="text-blue-200 text-xs">&copy; 2025 SMSGang. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 lg:hidden mb-8">
            <div className="size-8 bg-[#0f6df0]/10 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-[#0f6df0] text-xl">sms</span>
            </div>
            <span className="text-lg font-bold text-slate-900">SMSGang</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Create your account</h1>
            <p className="text-slate-500 mt-1 text-sm">Start receiving SMS verifications in minutes</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full name</label>
              <div className="flex items-stretch rounded-lg border border-slate-300 bg-white focus-within:border-[#0f6df0] focus-within:ring-2 focus-within:ring-[#0f6df0]/20 transition-all">
                <div className="flex items-center pl-3 text-slate-400">
                  <span className="material-symbols-outlined text-xl">person</span>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="John Doe"
                  className="flex-1 px-3 py-2.5 bg-transparent border-none outline-none text-sm text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label>
              <div className="flex items-stretch rounded-lg border border-slate-300 bg-white focus-within:border-[#0f6df0] focus-within:ring-2 focus-within:ring-[#0f6df0]/20 transition-all">
                <div className="flex items-center pl-3 text-slate-400">
                  <span className="material-symbols-outlined text-xl">mail</span>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="flex-1 px-3 py-2.5 bg-transparent border-none outline-none text-sm text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="flex items-stretch rounded-lg border border-slate-300 bg-white focus-within:border-[#0f6df0] focus-within:ring-2 focus-within:ring-[#0f6df0]/20 transition-all">
                <div className="flex items-center pl-3 text-slate-400">
                  <span className="material-symbols-outlined text-xl">lock</span>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  className="flex-1 px-3 py-2.5 bg-transparent border-none outline-none text-sm text-slate-900 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Use 8+ characters with a mix of letters &amp; numbers</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</label>
              <div className="flex items-stretch rounded-lg border border-slate-300 bg-white focus-within:border-[#0f6df0] focus-within:ring-2 focus-within:ring-[#0f6df0]/20 transition-all">
                <div className="flex items-center pl-3 text-slate-400">
                  <span className="material-symbols-outlined text-xl">lock_reset</span>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  required
                  placeholder="Repeat your password"
                  className="flex-1 px-3 py-2.5 bg-transparent border-none outline-none text-sm text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#0f6df0] text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#0d5ed9] disabled:opacity-60 shadow-lg shadow-[#0f6df0]/20 transition-all"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-xl">refresh</span>
                  Creating account...
                </>
              ) : (
                <>
                  Create Free Account
                  <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-[#0f6df0] hover:underline">
              Sign in
            </Link>
          </p>

          <p className="mt-8 text-center text-xs text-slate-400">
            By creating an account you agree to our{' '}
            <a href="#" className="hover:underline">Terms of Service</a>{' '}and{' '}
            <a href="#" className="hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
