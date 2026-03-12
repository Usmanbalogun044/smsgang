'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const HIDE_ON = ['/login', '/register', '/activations', '/orders', '/services'];

export default function Footer() {
  const pathname = usePathname();

  if (HIDE_ON.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
    return null;
  }

  return (
    <footer className="bg-white border-t border-slate-100 py-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 lg:gap-8">
          {/* Brand — spans 2 columns */}
          <div className="col-span-2 lg:col-span-2 flex flex-col gap-8">
            <div className="flex items-center gap-3">
              <div className="bg-[#0f6df0] p-1.5 rounded-lg">
                <span className="material-symbols-outlined text-white block" style={{ fontSize: 24 }}>
                  shield_person
                </span>
              </div>
              <h2 className="text-slate-900 text-2xl font-black">SMSGang</h2>
            </div>
            <p className="text-slate-500 text-lg leading-relaxed max-w-sm">
              Nigeria&apos;s leading platform for virtual numbers and instant SMS verification codes.
            </p>
            <div className="flex gap-4">
              {['public', 'alternate_email', 'share'].map((icon) => (
                <a
                  key={icon}
                  href="#"
                  className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-[#0f6df0] hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    {icon}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Products */}
          <div className="flex flex-col gap-6">
            <h5 className="font-black text-xs uppercase tracking-[0.2em] text-slate-900">Products</h5>
            <div className="flex flex-col gap-4">
              <a href="#" className="text-slate-500 hover:text-[#0f6df0] transition-colors text-sm font-semibold">API Docs</a>
              <a href="#" className="text-slate-500 hover:text-[#0f6df0] transition-colors text-sm font-semibold">Virtual Numbers</a>
              <a href="#" className="text-slate-500 hover:text-[#0f6df0] transition-colors text-sm font-semibold">Bulk SMS</a>
            </div>
          </div>

          {/* Support */}
          <div className="flex flex-col gap-6">
            <h5 className="font-black text-xs uppercase tracking-[0.2em] text-slate-900">Support</h5>
            <div className="flex flex-col gap-4">
              <a href="#" className="text-slate-500 hover:text-[#0f6df0] transition-colors text-sm font-semibold">Help Center</a>
              <a href="#" className="text-slate-500 hover:text-[#0f6df0] transition-colors text-sm font-semibold">Contact Us</a>
              <a href="#" className="text-slate-500 hover:text-[#0f6df0] transition-colors text-sm font-semibold">Status</a>
            </div>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-6">
            <h5 className="font-black text-xs uppercase tracking-[0.2em] text-slate-900">Legal</h5>
            <div className="flex flex-col gap-4">
              <Link href="#" className="text-slate-500 hover:text-[#0f6df0] transition-colors text-sm font-semibold">Privacy</Link>
              <Link href="#" className="text-slate-500 hover:text-[#0f6df0] transition-colors text-sm font-semibold">Terms</Link>
              <a href="#" className="text-slate-500 hover:text-[#0f6df0] transition-colors text-sm font-semibold">Refunds</a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-20 pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-400 text-sm font-medium">
            © 2024 SMSGang. All rights reserved. Premium SMS Gateway.
          </p>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>language</span>
            <span>English (Nigeria)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

