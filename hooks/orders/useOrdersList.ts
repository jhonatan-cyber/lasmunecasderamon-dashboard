import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useOrdersSSE } from '@/hooks/orders/useOrdersSSE';

export interface Order {
  id_pedido: number;
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
  id_solicitud: number;
  cliente_id?: number;
  habitacion_id: number;
  precio_servicio: number;
  precio_habitacion: number;
  anfitrionas_ids: number[];
  metodo_pago: string;
  tiempo: number;
  total: number;
  solicitado_por: number;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  motivo_rechazo?: string;
  procesado_por?: number;
  fecha_solicitud: string;
  fecha_procesamiento?: string;
  solicitado_por_nombre: string;
  solicitado_por_nick: string;
  procesado_por_nombre?: string;
  cliente_nombre?: string;
  habitacion_nombre: string;
  habitacion_numero: number;
}

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
      if (data.success) setOrders(data.data);
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
        setServicios((data.data || []).filter((s: any) => s.estado === 'pendiente'));
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoadingServicios(false);
    }
  }, []);

  const handleOrderUpdate = useCallback((data: { type: string; orderId: number }) => {
    if (data.type === 'order-processed' || data.type === 'order-deleted') {
      setOrders(prev => prev.filter(o => o.id_pedido !== data.orderId));
      fetchServicios();
    } else if (data.type === 'order-created') {
      fetchOrders();
    }
  }, [fetchOrders, fetchServicios]);

  useOrdersSSE(handleOrderUpdate);

  useEffect(() => {
    fetchOrders();
    fetchServicios();
  }, [fetchOrders, fetchServicios]);

  // Public filtering logic
  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders;
    const term = searchTerm.toLowerCase();
    return orders.filter(o => 
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
    return pendings.filter(s => 
      s.cliente_nombre?.toLowerCase().includes(term) ||
      s.habitacion_nombre.toLowerCase().includes(term) ||
      s.solicitado_por_nombre.toLowerCase().includes(term) ||
      s.id_solicitud.toString().includes(term)
    );
  }, [servicios, searchServiciosTerm]);

  const deleteOrder = async (orderId: number) => {
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

  const deleteServicio = async (servicioId: number) => {
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
    searchTerm, setSearchTerm,
    searchServiciosTerm, setSearchServiciosTerm,
    filteredOrders,
    filteredServicios,
    deleteOrder,
    deleteServicio,
    refresh: () => { fetchOrders(); fetchServicios(); }
  };
};
