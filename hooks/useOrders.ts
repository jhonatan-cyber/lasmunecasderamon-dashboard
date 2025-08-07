import { useState, useEffect, useCallback } from "react";
import { Order } from "@/types/order";
import { showSuccessToast, showErrorToast } from "@/lib/toastUtils";

export default function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderDetail, setOrderDetail] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders");
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

  const createOrder = async (order: Partial<Order>) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      const data = await res.json();
      if (data.success) {
        showSuccessToast(data.message || "Pedido creado correctamente");
        await fetchOrders();
      } else {
        showErrorToast(data.message || "Error al crear pedido");
        setError(data.message || "Error al crear pedido");
      }
    } catch (err) {
      showErrorToast("Error de red al crear pedido");
      setError("Error de red al crear pedido");
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrder = async (order: Partial<Order>) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders?id=${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      const data = await res.json();
      if (data.success) {
        showSuccessToast(data.message || "Pedido actualizado correctamente");
        await fetchOrders();
      } else {
        showErrorToast(data.message || "Error al actualizar pedido");
        setError(data.message || "Error al actualizar pedido");
      }
    } catch (err) {
      showErrorToast("Error de red al actualizar pedido");
      setError("Error de red al actualizar pedido");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteOrder = async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showSuccessToast(data.message || "Pedido eliminado correctamente");
        await fetchOrders();
      } else {
        showErrorToast(data.message || "Error al eliminar pedido");
        setError(data.message || "Error al eliminar pedido");
      }
    } catch (err) {
      showErrorToast("Error de red al eliminar pedido");
      setError("Error de red al eliminar pedido");
    } finally {
      setIsLoading(false);
    }
  };

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
    createOrder,
    updateOrder,
    deleteOrder,
  };
} 