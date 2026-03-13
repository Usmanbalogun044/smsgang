'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

// Routes where the global Navbar and Footer should be hidden
const HIDE_LAYOUT_ROUTES = ['/services', '/admin', '/dashboard', '/activations', '/orders', '/settings'];
// Routes where we might want checks (like partial matches)
const HIDE_LAYOUT_PREFIXES = ['/services', '/admin', '/dashboard', '/activations', '/orders', '/settings'];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Check if current path starts with any of the prefixes
  const isDashboard = HIDE_LAYOUT_PREFIXES.some(prefix => pathname?.startsWith(prefix));
  // Special case for login page which might want a clean layout too? Usually login pages have navbar or simple header.
  // For now let's keep navbar on login, but hide on dashboard.

  if (isDashboard) {
    return <main className="flex-1 h-screen overflow-hidden">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}