'use client';

import { Suspense } from 'react';
import CreateSmmOrderContent from './content';

export default function CreateSmmOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">Loading...</div>}>
      <CreateSmmOrderContent />
    </Suspense>
  );
}
