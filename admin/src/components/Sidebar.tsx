'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/services', label: 'Services', icon: 'inventory_2' },
  { href: '/countries', label: 'Countries', icon: 'public' },
  { href: '/pricing', label: 'Pricing', icon: 'sell' },
  { href: '/activations', label: 'Activations', icon: 'bolt' },
  { href: '/orders', label: 'Orders', icon: 'history' },
  { href: '/users', label: 'Users', icon: 'group' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const initials = user ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : 'AD';

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 min-h-screen transition-colors">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-[#0f6df0] rounded-lg flex items-center justify-center text-white shadow-lg shadow-[#0f6df0]/20 flex-shrink-0 transition-transform hover:scale-105">
          <span className="material-symbols-outlined !text-2xl">dataset</span>
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-bold leading-none text-slate-900 dark:text-white truncate">SMSGang Admin</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 uppercase font-bold tracking-widest">Management Console</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map(({ href, label, icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-[#0f6df0]/10 text-[#0f6df0] shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className={`material-symbols-outlined !text-[20px] transition-colors ${isActive ? 'text-[#0f6df0]' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
                {icon}
              </span>
              <span className={`text-sm tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#0f6df0] shadow-[0_0_8px_rgba(15,109,240,0.6)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 transition-colors group"
        >
          <span className="material-symbols-outlined !text-[20px] text-slate-400 group-hover:text-red-500">logout</span>
          <span className="text-sm font-medium">Sign Out</span>
        </button>

        <div className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0f6df0] to-[#0d5ed9] flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name ?? 'Admin User'}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-500 font-medium truncate">Super Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
