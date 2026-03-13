'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

type Props = {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  className?: string; // Add className prop for flexibility
};

export default function DashboardSidebar({ mobileOpen = false, setMobileOpen }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const closeMobile = () => setMobileOpen?.(false);

  const linkClass = (href: string) => {
    const active = pathname === href || pathname.startsWith(href + '/');
    return `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
      active
        ? 'bg-[#0f6df0]/10 text-[#0f6df0] font-semibold'
        : 'text-slate-600 hover:bg-slate-50 font-medium'
    }`;
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity ${mobileOpen ? 'block' : 'hidden'}`}
        onClick={() => setMobileOpen?.(false)}
      />
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 h-screen bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 md:static md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Mobile Header with Close Button */}
        <div className="md:hidden absolute top-4 right-4 z-50">
           <button onClick={() => setMobileOpen?.(false)} className="p-2 text-slate-400 hover:text-slate-600">
             <span className="material-symbols-outlined">close</span>
           </button>
        </div>

        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="bg-[#0f6df0] p-2 rounded-lg text-white">
            <span className="material-symbols-outlined block" style={{ fontSize: 20 }}>sms</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">SMSGang</h1>
        </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1">
        <Link href="/services" className={linkClass('/services')} onClick={closeMobile}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>dashboard</span>
          Dashboard
        </Link>
        <Link href="/activations" className={linkClass('/activations')} onClick={closeMobile}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>bolt</span>
          Active Activations
        </Link>
        <Link href="/orders" className={linkClass('/orders')} onClick={closeMobile}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>history</span>
          Order History
        </Link>

        <div className="pt-4 pb-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
          Account
        </div>
        <Link href="/settings" className={linkClass('/settings')} onClick={closeMobile}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person</span>
          Profile
        </Link>
        <Link href="/settings" className={linkClass('/settings')} onClick={closeMobile}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>support_agent</span>
          Support
        </Link>
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-slate-200">
        <div className="bg-slate-50 p-4 rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[#0f6df0]" style={{ fontSize: 16 }}>verified_user</span>
          <span className="text-xs font-semibold text-slate-600">Direct Pay Enabled</span>
        </div>
        {user && (
          <div className="flex items-center gap-3 mt-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 bg-[#0f6df0]">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="mt-2 w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
          Logout
        </button>
      </div>
      </aside>
    </>
  );
}
