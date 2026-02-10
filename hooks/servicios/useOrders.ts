import { useState, useCallback } from "react";
import { Order } from "@/types/order";
import { showSuccessToast, showErrorToast } from "@/lib/toastUtils";
import { useGenericFetch } from "../shared/useGenericFetch";

export default function useOrders() {
  const [orderDetail, setOrderDetail] = useState<any[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Usar hook genérico para fetch de orders
  const {
    data: orders,
    isLoading: fetchLoading,
    error: fetchError,
    refetch: fetchOrders,
  } = useGenericFetch<Order>('/api/orders', {
    initialFetch: true,
    transform: (data) => data.success ? data.data : []
  });

  // Combinar loading y error states
  const isLoading = fetchLoading || mutationLoading;
  const error = fetchError || mutationError;

  const createOrder = useCallback(async (order: Partial<Order>) => {
    setMutationLoading(true);
    setMutationError(null);
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
        setMutationError(data.message || "Error al crear pedido");
      }
    } catch (err) {
      showErrorToast("Error de red al crear pedido");
      setMutationError("Error de red al crear pedido");
    } finally {
      setMutationLoading(false);
    }
  }, [fetchOrders]);

  const updateOrder = useCallback(async (order: Partial<Order>) => {
    setMutationLoading(true);
    setMutationError(null);
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
        setMutationError(data.message || "Error al actualizar pedido");
      }
    } catch (err) {
      showErrorToast("Error de red al actualizar pedido");
      setMutationError("Error de red al actualizar pedido");
    } finally {
      setMutationLoading(false);
    }
  }, [fetchOrders]);

  const deleteOrder = useCallback(async (id: number) => {
    setMutationLoading(true);
    setMutationError(null);
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
        setMutationError(data.message || "Error al eliminar pedido");
      }
    } catch (err) {
      showErrorToast("Error de red al eliminar pedido");
      setMutationError("Error de red al eliminar pedido");
    } finally {
      setMutationLoading(false);
    }
  }, [fetchOrders]);

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