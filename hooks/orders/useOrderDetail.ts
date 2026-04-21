import { useState, useEffect } from 'react';

export const useOrderDetail = (orderId: string | number | null) => {
  const [detail, setDetail] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setDetail([]);
      return;
    }

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/orders/detail?id=${orderId}`);
        const data = await res.json();
        if (data.success) {
          setDetail(data.data);
        } else {
          setError(data.message || 'Error al cargar detalles');
        }
      } catch (err) {
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [orderId]);

  return { detail, loading, error };
};
