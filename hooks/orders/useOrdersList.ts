import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useOrdersSSE } from '@/hooks/orders/useOrdersSSE';

export interface Order {
  id: string;
  id_pedido: string;
  cliente: string;
  codigo: string;
  garzon: string;
  nicks: string;
  subtotal: number;
  total: number;
  estado: number;
  fecha_crea: string;
}

export interface SolicitudServicio {
  id_solicitud: string;
  cliente_id?: string;
  habitacion_id: string;
  precio_servicio: number;
  precio_habitacion: number;
  anfitrionas_ids: string[];
  metodo_pago: string;
  tiempo: number;
  total: number;
  solicitado_por: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  motivo_rechazo?: string;
  procesado_por?: string;
  fecha_solicitud: string;
  fecha_procesamiento?: string;
  solicitado_por_nombre: string;
  solicitado_por_nick: string;
  procesado_por_nombre?: string;
  cliente_nombre?: string;
  habitacion_nombre: string;
  habitacion_numero: number;
}


const normalizeOrder = (order: any): Order => {
  const normalizedId = String(order?.id_pedido ?? order?.id ?? '');
  return {
    ...order,
    id: String(order?.id ?? normalizedId),
    id_pedido: normalizedId,
  };
};

const normalizeServicio = (servicio: any): SolicitudServicio => ({
  ...servicio,
  id_solicitud: String(servicio?.id_solicitud ?? servicio?.id ?? ''),
  cliente_id: servicio?.cliente_id ? String(servicio.cliente_id) : undefined,
  habitacion_id: String(servicio?.habitacion_id ?? ''),
  anfitrionas_ids: Array.isArray(servicio?.anfitrionas_ids)
    ? servicio.anfitrionas_ids.map((id: any) => String(id))
    : [],
  solicitado_por: String(servicio?.solicitado_por ?? ''),
  procesado_por: servicio?.procesado_por ? String(servicio.procesado_por) : undefined,
});

export const useOrdersList = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [servicios, setServicios] = useState<SolicitudServicio[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingServicios, setLoadingServicios] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchServiciosTerm, setSearchServiciosTerm] = useState('');

  const fetchOrders = useCallback(async () => {
    try {
      setLoadingOrders(true);
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success) setOrders((data.data || []).map(normalizeOrder));
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const fetchServicios = useCallback(async () => {
    try {
      setLoadingServicios(true);
      const res = await fetch('/api/solicitudes-servicios?estado=pendiente');
      const data = await res.json();
      if (data.success) {
        setServicios((data.data || []).map(normalizeServicio).filter((s: any) => s.estado === 'pendiente'));
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoadingServicios(false);
    }
  }, []);

  const handleOrderUpdate = useCallback(
    (data: { type: string; orderId: string | number }) => {
      const normalizedOrderId = String(data.orderId);
      if (data.type === 'order-processed' || data.type === 'order-deleted') {
        setOrders(prev => prev.filter(o => o.id_pedido !== normalizedOrderId));
        fetchServicios();
      } else if (data.type === 'order-created') {
        fetchOrders();
      }
    },
    [fetchOrders, fetchServicios]
  );

  useOrdersSSE(handleOrderUpdate);

  useEffect(() => {
    fetchOrders();
    fetchServicios();
  }, [fetchOrders, fetchServicios]);

  // Public filtering logic
  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders;
    const term = searchTerm.toLowerCase();
    return orders.filter(
      o =>
        o.cliente.toLowerCase().includes(term) ||
        o.codigo.toLowerCase().includes(term) ||
        o.garzon.toLowerCase().includes(term) ||
        o.nicks.toLowerCase().includes(term)
    );
  }, [orders, searchTerm]);

  const filteredServicios = useMemo(() => {
    const pendings = servicios.filter(s => s.estado === 'pendiente');
    if (!searchServiciosTerm) return pendings;
    const term = searchServiciosTerm.toLowerCase();
    return pendings.filter(
      s =>
        s.cliente_nombre?.toLowerCase().includes(term) ||
        s.habitacion_nombre.toLowerCase().includes(term) ||
        s.solicitado_por_nombre.toLowerCase().includes(term) ||
        s.id_solicitud.toString().includes(term)
    );
  }, [servicios, searchServiciosTerm]);

  const deleteOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setOrders(prev => prev.filter(o => o.id_pedido !== orderId));
        toast.success('Pedido eliminado');
        return true;
      }
      toast.error(data.message || 'Error al eliminar');
      return false;
    } catch {
      toast.error('Error de conexión');
      return false;
    }
  };

  const deleteServicio = async (servicioId: string) => {
    try {
      const res = await fetch(`/api/solicitudes-servicios?id=${servicioId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setServicios(prev => prev.filter(s => s.id_solicitud !== servicioId));
        toast.success('Solicitud eliminada');
        return true;
      }
      toast.error(data.message || 'Error al eliminar');
      return false;
    } catch {
      toast.error('Error de conexión');
      return false;
    }
  };

  return {
    orders,
    servicios,
    loadingOrders,
    loadingServicios,
    searchTerm,
    setSearchTerm,
    searchServiciosTerm,
    setSearchServiciosTerm,
    filteredOrders,
    filteredServicios,
    deleteOrder,
    deleteServicio,
    refresh: () => {
      fetchOrders();
      fetchServicios();
    }
  };
};
