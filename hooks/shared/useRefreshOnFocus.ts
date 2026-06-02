'use client';

import { useEffect } from 'react';

interface UseRefreshOnFocusOptions {
  enabled?: boolean;
  immediate?: boolean;
}

// Refreshes data on mount, when the window regains focus, and when the tab becomes visible again.
export function useRefreshOnFocus(
  refresh: () => void | Promise<unknown>,
  options: UseRefreshOnFocusOptions = {}
) {
  const { enabled = true, immediate = true } = options;

  useEffect(() => {
    if (!enabled) return;

    if (immediate) {
      void refresh();
    }

    const handleFocus = () => {
      void refresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, immediate, refresh]);
}
