'use client';

import { useRouter } from 'next/navigation';

export default function SearchRedirect() {
  const router = useRouter();
  return (
    <input
      className="w-full bg-transparent border-none focus:ring-0 px-4 py-5 text-xl font-medium placeholder:text-slate-300 cursor-pointer"
      placeholder="Search service (e.g. WhatsApp, Google...)"
      type="text"
      readOnly
      onClick={() => router.push('/services')}
    />
  );
}
