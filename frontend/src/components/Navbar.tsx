'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { useRouter, usePathname } from 'next/navigation';

const HIDE_ON = ['/login', '/register', '/activations', '/orders', '/services'];

export default function Navbar() {
  const { user, logout, loading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  if (HIDE_ON.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header
      className="flex items-center justify-between border-b border-slate-100 px-6 md:px-12 lg:px-24 py-5 sticky top-0 z-[100]"
      style={{
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <Link href="/" className="flex items-center gap-3 cursor-pointer">
        <div
          className="bg-[#0f6df0] p-1.5 rounded-lg"
          style={{ boxShadow: '0 4px 14px rgba(15,109,240,0.25)' }}
        >
          <span className="material-symbols-outlined text-white block" style={{ fontSize: 24 }}>
            shield_person
          </span>
        </div>
        <h2 className="text-slate-900 text-2xl font-black leading-tight tracking-tight">SMSGang</h2>
      </Link>

      <div className="flex flex-1 justify-end gap-10 items-center">
        <nav className="hidden lg:flex items-center gap-10">
          <Link
            href="/"
            className="text-slate-600 text-sm font-semibold hover:text-[#0f6df0] transition-colors"
          >
            Home
          </Link>
          <a
            href="/#pricing"
            className="text-slate-600 text-sm font-semibold hover:text-[#0f6df0] transition-colors"
          >
            Pricing
          </a>
          <a
            href="#"
            className="text-slate-600 text-sm font-semibold hover:text-[#0f6df0] transition-colors"
          >
            API Documentation
          </a>
        </nav>

        <div className="flex gap-4">
          {loading ? (
            <div className="w-32 h-11 bg-slate-100 animate-pulse rounded-xl" />
          ) : user ? (
            <>
              <Link
                href="/activations"
                className="hidden sm:flex items-center justify-center rounded-xl h-11 px-6 font-bold text-slate-700 hover:bg-slate-100 transition-all"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center rounded-xl h-11 px-7 bg-[#0f6df0] text-white font-bold active:scale-95 transition-all"
                style={{ boxShadow: '0 8px 24px rgba(15,109,240,0.3)' }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:flex items-center justify-center rounded-xl h-11 px-6 font-bold text-slate-700 hover:bg-slate-100 transition-all"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="flex items-center justify-center rounded-xl h-11 px-7 bg-[#0f6df0] text-white font-bold active:scale-95 transition-all"
                style={{ boxShadow: '0 8px 24px rgba(15,109,240,0.3)' }}
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

