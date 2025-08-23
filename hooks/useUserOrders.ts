import { useState, useEffect, useCallback } from "react";
import { showSuccessToast, showErrorToast } from "@/lib/toastUtils";

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
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [orderDetail, setOrderDetail] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/user");
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      } else {
        setError(data.message || "Error al obtener pedidos");
      }
    } catch (err) {
      setError("Error de red al obtener pedidos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

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
