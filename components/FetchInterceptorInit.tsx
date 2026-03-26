'use client';

import { useEffect } from 'react';
import { setupFetchInterceptor } from '@/lib/api/fetchInterceptor';

/**
 * Componente que inicializa el interceptor de fetch
 * Debe montarse una sola vez en el layout raíz
 */
export function FetchInterceptorInit() {
  useEffect(() => {
    setupFetchInterceptor();
  }, []);

  return null;
}
