import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import logger from '@/lib/utils/logger';
import { isChampagneProduct } from '@/components/orders/productModalRules';

export function useCuentaCobro() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [searchRoom, setSearchRoom] = useState('');
  const [isCobrando, setIsCobrando] = useState(false);
  const [metodoPago, setMetodoPago] = useState('');
  const [propina, setPropina] = useState<number | null>(null);
  const [propinaActiva, setPropinaActiva] = useState(false);
  const [habitacionId, setHabitacionId] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch('/api/rooms');
        const data = await res.json();
        if (data.success) {
          setRooms(data.data);
        }
      } catch (error) {
        logger.captureException(error, { context: 'CuentaCobro:fetchRooms' });
        toast.error('Error al cargar habitaciones');
      }
    };
    fetchRooms();
  }, []);

  const habitacionesActivas = rooms.filter(r => r.status === 1 || r.estado === 1);

  const habitacionesFiltradas = searchRoom.trim()
    ? habitacionesActivas.filter(
        r =>
          (r.nombre || r.name || '').toLowerCase().includes(searchRoom.toLowerCase()) ||
          (r.numero || '').toLowerCase().includes(searchRoom.toLowerCase())
      )
    : habitacionesActivas;

  const resetStates = () => {
    setSearchRoom('');
    setIsCobrando(false);
    setMetodoPago('');
    setPropina(null);
    setPropinaActiva(false);
    setHabitacionId(null);
    setShowError(false);
  };

  const handleCobrarCuenta = async (
    cuenta: any,
    propinaMonto: number | null,
    metodoPagoSeleccionado: string,
    onSuccess: () => void
  ) => {
    const cuentaId = cuenta?.id_cuenta ?? cuenta?.id ?? null;
    const montoFinal = Number(cuenta?.total ?? cuenta?.sub_total ?? 0);
    const propinaFinal = Number(propinaMonto ?? 0);

    if (!cuenta || !cuentaId || !metodoPagoSeleccionado) {
      setShowError(true);
      toast.error('Método de pago requerido');
      return;
    }

    setIsCobrando(true);

    try {
      const cobroRes = await fetch(`/api/cuentas/${cuentaId}/cobrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metodoPago: metodoPagoSeleccionado,
          metodo_pago: metodoPagoSeleccionado,
          tipoPago: metodoPagoSeleccionado,
          montoFinal,
          total_cobrado: montoFinal,
          propinaFinal,
          propina: propinaFinal
        })
      });

      if (!cobroRes.ok) {
        let errorMessage = 'Error al cobrar la cuenta';
        try {
          const rawError = await cobroRes.text();
          const errorData = rawError ? JSON.parse(rawError) : null;
          errorMessage =
            errorData?.message ||
            errorData?.error?.message ||
            errorData?.error?.details?.[0]?.message ||
            errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      await cobroRes.json();

      const ventaRes = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origen: 'cuenta',
          skip_client_prepago: true,
          cliente_id: cuenta?.cliente_id != null ? String(cuenta.cliente_id) : null,
          pedido_id: cuenta?.pedido_id != null ? String(cuenta.pedido_id) : null,
          metodo_pago: metodoPagoSeleccionado,
          propina: propinaFinal,
          sub_total: Number(cuenta?.sub_total ?? 0),
          total: montoFinal,
          total_comision: Number(cuenta?.total_comision ?? 0),
          codigo: cuenta?.codigo,
          detalles:
            cuenta.detalles?.map((d: any) => ({
              producto_id: String(d.producto_id ?? d.id_producto),
              precio: Number(d.precio ?? 0),
              cantidad: Number(d.cantidad ?? 1),
              sub_total: Number(d.sub_total ?? d.subtotal ?? 0),
              comision: Number(d.comision ?? 0),
              hostess_id: d.hostess_id != null ? String(d.hostess_id) : null
            })) || [],
          usuarios:
            cuenta?.usuarios?.map((u: any) => String(u.usuario_id ?? u.id_usuario ?? u)) || []
        })
      });

      if (!ventaRes.ok) {
        let errorMessage = 'Error al registrar la venta';
        try {
          const errorData = await ventaRes.json();
          errorMessage = errorData?.message || errorData?.error || errorMessage;
          logger.error('[CobrarCuenta] Error del servidor:', errorData);
        } catch {
          logger.error('[CobrarCuenta] No se pudo parsear error:', ventaRes.status);
        }
        throw new Error(errorMessage);
      }

      toast.success('Cuenta cobrada exitosamente');
      resetStates();
      onSuccess();
    } catch (error) {
      logger.captureException(error, { context: 'CuentaCobro:handleCobrarCuenta' });
      toast.error(error instanceof Error ? error.message : 'Error al cobrar la cuenta');
      setShowError(true);
    } finally {
      setIsCobrando(false);
    }
  };

  return {
    rooms,
    searchRoom,
    isCobrando,
    metodoPago,
    propina,
    propinaActiva,
    habitacionId,
    showError,

    setSearchRoom,
    setMetodoPago,
    setPropina,
    setPropinaActiva,
    setHabitacionId,
    setShowError,

    habitacionesActivas,
    habitacionesFiltradas,

    handleCobrarCuenta,
    resetStates,
    isChampagneProduct
  };
}
