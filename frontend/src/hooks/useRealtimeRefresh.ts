'use client';

import { useEffect } from 'react';

type UseRealtimeRefreshOptions = {
  enabled?: boolean;
  intervalMs?: number;
};

export default function useRealtimeRefresh(
  refreshFn: () => void,
  { enabled = true, intervalMs = 15000 }: UseRealtimeRefreshOptions = {},
) {
  useEffect(() => {
    if (!enabled) return;

    const runRefresh = () => {
      if (document.visibilityState === 'visible') {
        refreshFn();
      }
    };

    const interval = window.setInterval(runRefresh, intervalMs);
    window.addEventListener('focus', runRefresh);
    document.addEventListener('visibilitychange', runRefresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', runRefresh);
      document.removeEventListener('visibilitychange', runRefresh);
    };
  }, [enabled, intervalMs, refreshFn]);
}
