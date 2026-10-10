'use client';

import { useState, useEffect, useCallback } from 'react';
import logger from '@/lib/utils/logger';

export interface SettingsProduct {
  id: string;
  code: string;
  name: string;
  category_id: string;
  price: number;
  commission: number;
  max_anfitrionas: number | null;
  categoria?: string;
  status: number;
}

let cached: SettingsProduct[] | null = null;
let inflight: Promise<SettingsProduct[]> | null = null;

async function fetchOnce(): Promise<SettingsProduct[]> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = fetch('/api/products')
    .then(async res => {
      if (!res.ok) throw new Error('No se pudieron cargar los productos');
      return res.json();
    })
    .then(result => {
      if (!result.success || !Array.isArray(result.data))
        throw new Error(result.message || 'Respuesta de productos inválida');
      const data =
        result.success && Array.isArray(result.data) ? (result.data as SettingsProduct[]) : [];
      cached = data;
      return data;
    })
    .catch(err => {
      logger.captureException(err, { context: 'useSettingsProducts:fetch' });
      throw err;
    })
    .finally(() => {
      inflight = null;
    }) as Promise<SettingsProduct[]>;
  return inflight;
}

export function invalidateSettingsProducts() {
  cached = null;
}

export function useSettingsProducts() {
  const [productos, setProductos] = useState<SettingsProduct[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      cached = null;
      const data = await fetchOnce();
      setProductos(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudieron cargar los productos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    if (cached) {
      setProductos(cached);
      setLoading(false);
      return () => {
        alive = false;
      };
    }
    setLoading(true);
    fetchOnce()
      .then(data => {
        if (alive) {
          setProductos(data);
          setLoading(false);
        }
      })
      .catch(error => {
        if (alive) {
          setError(error instanceof Error ? error.message : 'No se pudieron cargar los productos');
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  return { productos, loading, error, refresh };
}
