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

    // Validación de champaña si aplica
    const hasChampagne = cuenta.detalles?.some((d: any) => isChampagneProduct(d));
    if (hasChampagne && !habitacionId) {
      setShowError(true);
      toast.error('Selecciona una habitación para productos de champaña');
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
          habitacion_id: habitacionId,
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
          cuenta_id: cuentaId,
          cliente_id: cuenta?.cliente_id ?? null,
          pedido_id: cuenta?.pedido_id ?? null,
          habitacion_id: cuenta?.habitacion_id ?? habitacionId ?? null,
          metodo_pago: metodoPagoSeleccionado,
          propina: propinaFinal,
          sub_total: Number(cuenta?.sub_total ?? 0),
          total: montoFinal,
          total_comision: Number(cuenta?.total_comision ?? 0),
          tiempo: Number(cuenta?.tiempo ?? 0),
          codigo: cuenta?.codigo,
          fecha: new Date().toISOString(),
          detalles: cuenta.detalles,
          usuarios: cuenta?.usuarios?.map((u: any) => u.usuario_id ?? u.id_usuario ?? u) || []
        })
      });

      if (!ventaRes.ok) {
        throw new Error('Error al registrar la venta');
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
