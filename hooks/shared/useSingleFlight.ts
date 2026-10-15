'use client';

import { useRef } from 'react';

/** El bloqueo se toma antes del primer await, incluso antes del siguiente render. */
export function useSingleFlight<Args extends unknown[], Result>(
  operation: (...args: Args) => Promise<Result>
): (...args: Args) => Promise<Result> {
  const pending = useRef<Promise<Result> | null>(null);
  return (...args) => {
    if (pending.current) return pending.current;
    const promise = Promise.resolve()
      .then(() => operation(...args))
      .finally(() => {
        if (pending.current === promise) pending.current = null;
      });
    pending.current = promise;
    return promise;
  };
}
