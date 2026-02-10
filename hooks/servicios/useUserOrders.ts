import { useState, useCallback } from "react";
import { useGenericFetch } from "../shared/useGenericFetch";

interface UserOrder {
  id_pedido: number;
  cliente: string;
  codigo: string;
  garzon: string;
  nicks: string;
  subtotal: number;
  total: number;
  estado: number;
}

export default function useUserOrders() {
  const [orderDetail, setOrderDetail] = useState<any[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const {
    data: orders,
    isLoading,
    error,
    refetch: fetchOrders,
  } = useGenericFetch<UserOrder>("/api/orders/user", {
    initialFetch: true,
    transform: (data) => (data.success ? data.data : []),
  });

  const fetchOrderDetail = useCallback(async (id: number | string) => {
    setIsDetailLoading(true);
    setDetailError(null);
    try {
      const res = await fetch(`/api/orders/detail?id=${id}`);
      const data = await res.json();
      if (data.success) {
        setOrderDetail(data.data);
      } else {
        setDetailError(data.message || "Error al obtener el detalle del pedido");
      }
    } catch (err) {
      setDetailError("Error de red al obtener el detalle del pedido");
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  return {
    orders,
    orderDetail,
    isLoading,
    isDetailLoading,
    error,
    detailError,
    fetchOrders,
    fetchOrderDetail,
    refetch: fetchOrders,
  };
}
