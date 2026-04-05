type VentaSearchRow = {
  codigo?: string | null;
  cliente_nombre?: string | null;
  habitacion_numero?: string | null;
  estado?: number | string | null;
  metodo_pago?: string | null;
  usuarios?: Array<{
    nick?: string | null;
  }>;
  detalles?: unknown[];
  id?: string | number;
};

export const statusColors: Record<number, string> = {
  1: 'bg-green-100 text-green-800',
  2: 'bg-blue-100 text-blue-800',
  3: 'bg-yellow-100 text-yellow-800',
  0: 'bg-red-100 text-red-800',
};

export const statusLabels: Record<number, string> = {
  1: 'Completado',
  2: 'En proceso',
  3: 'Pdte. Anulacion',
  0: 'Anulado',
};

export const metodoPagoLabels = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  prepago: 'Prepago',
  mixto: 'Mixto',
};

export const anfitrionaColors = [
  'bg-blue-100 text-blue-800',
  'bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800',
  'bg-indigo-100 text-indigo-800',
  'bg-teal-100 text-teal-800',
  'bg-orange-100 text-orange-800',
  'bg-red-100 text-red-800',
  'bg-green-100 text-green-800',
];

export const formatCurrency = (value: number): string => {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const filterVentas = <T extends VentaSearchRow>(
  ventas: T[],
  searchTerm: string,
  filterStatus: string,
  filterMetodoPago: string
) => {
  return ventas.filter(venta => {
    const matchesSearch =
      searchTerm === '' ||
      venta.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venta.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venta.habitacion_numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venta.usuarios?.some(user => user.nick?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      filterStatus === 'all' || Number(venta.estado) === parseInt(filterStatus);
    const matchesMetodoPago =
      filterMetodoPago === 'all' || venta.metodo_pago === filterMetodoPago;

    return matchesSearch && matchesStatus && matchesMetodoPago;
  });
};

export const calculatePagination = <T extends VentaSearchRow>(
  filteredVentas: T[],
  currentPage: number,
  pageSize: number
) => {
  const totalItems = filteredVentas.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedVentas = filteredVentas.slice(startIndex, endIndex);

  return {
    totalItems,
    totalPages,
    paginatedVentas,
  };
};

export const solicitarAnulacionVenta = async (
  ventaId: string | number,
  motivo?: string,
  monto?: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch('/api/ventas/anulacion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ventaId,
        motivo: motivo || 'Solicitud de anulacion',
        monto: monto || 0,
      }),
    });

    if (!response.ok) {
      let errorMessage = `Error ${response.status}: ${response.statusText}`;

      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        try {
          await response.text();
          errorMessage = `Error del servidor: ${response.status}`;
        } catch {
          errorMessage = `Error de conexion: ${response.status}`;
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
};

export const getVentaDetails = async <T extends VentaSearchRow>(
  ventaId: string | number,
  ventas: T[]
): Promise<T | null> => {
  let venta = ventas.find(v => String(v.id) === String(ventaId));

  if (!venta || !venta.detalles || !Array.isArray(venta.detalles)) {
    try {
      const response = await fetch(`/api/ventas/${ventaId}`);
      if (response.ok) {
        const json = await response.json();
        venta = json.data as T;
      }
    } catch {
      return null;
    }
  }

  return venta || null;
};

export const sortVentas = <T extends VentaSearchRow & { fecha_crea?: string; total?: number | string }>(
  ventas: T[],
  sortBy: string,
  sortOrder: 'asc' | 'desc'
) => {
  return [...ventas].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'fecha_crea':
        comparison = new Date(a.fecha_crea || 0).getTime() - new Date(b.fecha_crea || 0).getTime();
        break;
      case 'total':
        comparison = Number(a.total || 0) - Number(b.total || 0);
        break;
      case 'cliente_nombre':
        comparison = (a.cliente_nombre || '').localeCompare(b.cliente_nombre || '');
        break;
      case 'codigo':
        comparison = (a.codigo || '').localeCompare(b.codigo || '');
        break;
      default:
        comparison = 0;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
};
