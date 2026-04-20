'use client';

import { useEffect } from 'react';
import { setupFetchInterceptor } from '@/lib/api/fetchInterceptor';

export function FetchInterceptorInit() {
  useEffect(() => {
    setupFetchInterceptor();
  }, []);

  return null;
}
