'use client';

import { useState, useEffect } from 'react';

export const useOrderDetail = (orderId: string | number | null) => {
  const [detail, setDetail] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDetail([]);
    setError(null);
    if (!orderId) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/orders/detail?id=${encodeURIComponent(String(orderId))}`, {
          signal: controller.signal
        });
        const data = await res.json();
        if (controller.signal.aborted) return;
        if (res.ok && data.success) {
          setDetail(Array.isArray(data.data) ? data.data : []);
        } else {
          setError(data.message || 'Error al cargar detalles');
        }
      } catch (err) {
        if (!controller.signal.aborted) setError('Error de conexión');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchDetail();
    return () => controller.abort();
  }, [orderId]);

  return { detail, loading, error };
};
