import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export function useCuentaCobro() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [searchRoom, setSearchRoom] = useState('');
  const [isCobrando, setIsCobrando] = useState(false);
  const [metodoPago, setMetodoPago] = useState('');
  const [propina, setPropina] = useState<number | null>(null);
  const [propinaActiva, setPropinaActiva] = useState(false);
  const [habitacionId, setHabitacionId] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  // Cargar habitaciones al inicializar
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch('/api/rooms');
        const data = await res.json();
        if (data.success) {
          setRooms(data.data);
        }
      } catch (error) {
        console.error('Error al cargar habitaciones:', error);
        toast.error('Error al cargar habitaciones');
      }
    };
    fetchRooms();
  }, []);

  // Filtro de habitaciones activas
  const habitacionesActivas = rooms.filter(r => r.status === 1 || r.estado === 1);

  // Filtro por búsqueda
  const habitacionesFiltradas = searchRoom.trim()
    ? habitacionesActivas.filter(
        r =>
          (r.nombre || r.name || '').toLowerCase().includes(searchRoom.toLowerCase()) ||
          (r.numero || '').toLowerCase().includes(searchRoom.toLowerCase())
      )
    : habitacionesActivas;

  // Validación de producto de champaña
  const isChampagneProduct = (producto: any) => {
    const normalized =
      typeof producto === 'string'
        ? producto
        : [
            producto?.categoria,
            producto?.categoria_nombre,
            producto?.category,
            producto?.product_name,
            producto?.nombre,
            producto?.producto
          ]
            .filter(Boolean)
            .join(' ');

    const categoria = normalized.toLowerCase();
    return (
      categoria.includes('champaña') ||
      categoria.includes('shampaña') ||
      categoria.includes('champagne')
    );
  };

  // Reset de states cuando cierra el modal
  const resetStates = () => {
    setSearchRoom('');
    setIsCobrando(false);
    setMetodoPago('');
    setPropina(null);
    setPropinaActiva(false);
    setHabitacionId(null);
    setShowError(false);
  };

  // Función principal de cobro - orquesta las 3 APIs
  const handleCobrarCuenta = async (
    cuenta: any,
    propinaMonto: number | null,
    metodoPagoSeleccionado: string,
    onSuccess: () => void
  ) => {
    const cuentaId = cuenta?.id_cuenta ?? cuenta?.id ?? null;
    const montoFinal = Number(cuenta?.total ?? cuenta?.sub_total ?? 0);
    const propinaFinal = Number(propinaMonto ?? 0);

    // Validaciones
    if (!cuenta || !cuentaId || !metodoPagoSeleccionado) {
      setShowError(true);
      toast.error('Método de pago requerido');
      return;
    }

    setIsCobrando(true);

    try {
      // 1️⃣ Llamada 1: Cobrar la cuenta
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
        } catch {
          // Mantener el mensaje genérico si la respuesta no puede parsearse
        }
        throw new Error(errorMessage);
      }

      await cobroRes.json();

      // 2️⃣ Llamada 2: Registrar venta
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
          console.error('[CobrarCuenta] Error del servidor:', errorData);
        } catch {
          console.error('[CobrarCuenta] No se pudo parsear error:', ventaRes.status);
        }
        throw new Error(errorMessage);
      }

      toast.success('Cuenta cobrada exitosamente');
      resetStates();
      onSuccess();
    } catch (error) {
      console.error('Error en el flujo de cobro:', error);
      toast.error(error instanceof Error ? error.message : 'Error al cobrar la cuenta');
      setShowError(true);
    } finally {
      setIsCobrando(false);
    }
  };

  return {
    // States
    rooms,
    searchRoom,
    isCobrando,
    metodoPago,
    propina,
    propinaActiva,
    habitacionId,
    showError,

    // Setters
    setSearchRoom,
    setMetodoPago,
    setPropina,
    setPropinaActiva,
    setHabitacionId,
    setShowError,

    // Computed
    habitacionesActivas,
    habitacionesFiltradas,

    // Methods
    handleCobrarCuenta,
    resetStates,
    isChampagneProduct
  };
}
