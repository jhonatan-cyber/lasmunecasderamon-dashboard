// Service utilities for cancellation flow and UI helpers.

export const solicitarAnulacionServicio = async (
  servicioId: number,
  motivo?: string
): Promise<{ success: boolean; error?: string; message?: string }> => {
  try {
    const response = await fetch(`/api/servicios/${servicioId}/solicitar-anulacion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        motivo: motivo || 'Solicitud de anulacion de servicio',
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

    const result = await response.json();
    return {
      success: true,
      message: result.message || 'Solicitud de anulacion enviada correctamente',
    };
  } catch {
    return {
      success: false,
      error: 'Error de conexion al solicitar anulacion',
    };
  }
};

export const formatCurrencyNoDecimals = (value: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const getEstadoBadgeColor = (estado: number): string => {
  switch (estado) {
    case 0:
      return 'bg-gray-100 text-gray-800';
    case 1:
      return 'bg-green-100 text-green-800';
    case 2:
      return 'bg-yellow-100 text-yellow-800';
    case 3:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getEstadoText = (estado: number): string => {
  switch (estado) {
    case 0:
      return 'Terminado';
    case 1:
      return 'En Proceso';
    case 2:
      return 'Pendiente Anulacion';
    case 3:
      return 'Anulado';
    default:
      return 'Desconocido';
  }
};
