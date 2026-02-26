export const statusColors: Record<number, string> = {
  1: "bg-green-100 text-green-800", // Completado
  2: "bg-blue-100 text-blue-800", // En proceso
  3: "bg-yellow-100 text-yellow-800", // Pendiente de anulación
  0: "bg-red-100 text-red-800", // Anulado
};

export const statusLabels: Record<number, string> = {
  1: "Completado",
  2: "En proceso",
  3: "Pdte. Anulación",
  0: "Anulado",
};

export const metodoPagoLabels = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
};

// Colores para los badges de anfitrionas
export const anfitrionaColors = [
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-indigo-100 text-indigo-800",
  "bg-teal-100 text-teal-800",
  "bg-orange-100 text-orange-800",
  "bg-red-100 text-red-800",
  "bg-green-100 text-green-800",
];

// Función para formatear números con puntos de miles
export const formatCurrency = (value: number): string => {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Función para filtrar ventas
export const filterVentas = (
  ventas: any[],
  searchTerm: string,
  filterStatus: string,
  filterMetodoPago: string
) => {
  return ventas.filter((venta) => {
    const matchesSearch =
      searchTerm === "" ||
      venta.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venta.cliente_nombre
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      venta.habitacion_numero
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      venta.usuarios?.some((u: any) =>
        u.nick?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesStatus =
      filterStatus === "all" ||
      Number(venta.estado) === parseInt(filterStatus);
    const matchesMetodoPago =
      filterMetodoPago === "all" || venta.metodo_pago === filterMetodoPago;

    return matchesSearch && matchesStatus && matchesMetodoPago;
  });
};

// Función para calcular paginación
export const calculatePagination = (
  filteredVentas: any[],
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

// Función para solicitar anulación de una venta
export const solicitarAnulacionVenta = async (ventaId: number, motivo?: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`/api/ventas/${ventaId}/solicitar-anulacion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        estado: 3, // 3 = Pendiente de anulación
        motivo: motivo || "Solicitud de anulación"
      }),
    });

    if (!response.ok) {
      // Intentar leer la respuesta como JSON primero
      let errorMessage = `Error ${response.status}: ${response.statusText}`;

      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (jsonError) {
        // Si no es JSON válido, intentar leer como texto
        try {
          const textResponse = await response.text();

          errorMessage = `Error del servidor: ${response.status}`;
        } catch (textError) {

          errorMessage = `Error de conexión: ${response.status}`;
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }

    return { success: true };
  } catch (error) {

    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    };
  }
};

// Función para obtener detalles de una venta
export const getVentaDetails = async (ventaId: number, ventas: any[]) => {
  // Buscar la venta en el estado local primero
  let venta = ventas.find((v) => v.id === ventaId);

  // Si no se encuentra o no tiene detalles completos, obtener desde el API
  if (!venta || !venta.detalles || !Array.isArray(venta.detalles)) {
    try {
      const response = await fetch(`/api/ventas/${ventaId}`);
      if (response.ok) {
        venta = await response.json();
      }
    } catch (error) {

      return null;
    }
  }

  return venta;
};
