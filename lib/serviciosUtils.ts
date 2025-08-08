import { ServicioWithDetails } from "@/types/servicio";

// Función para solicitar anulación de un servicio
export const solicitarAnulacionServicio = async (servicioId: number, motivo?: string): Promise<{ success: boolean; error?: string; message?: string }> => {
  try {

    
    const response = await fetch(`/api/servicios/${servicioId}/solicitar-anulacion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Incluir cookies en la solicitud
      body: JSON.stringify({ 
        motivo: motivo || "Solicitud de anulación de servicio"
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

    const result = await response.json();
  
    return { 
      success: true, 
      message: result.message || "Solicitud de anulación enviada correctamente"
    };
  } catch (error) {
   
    return { 
      success: false, 
      error: "Error de conexión al solicitar anulación"
    };
  }
};

// Función para formatear moneda sin decimales
export const formatCurrencyNoDecimals = (value: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Función para obtener el color del badge según el estado
export const getEstadoBadgeColor = (estado: number): string => {
  switch (estado) {
    case 0:
      return "bg-gray-100 text-gray-800";
    case 1:
      return "bg-green-100 text-green-800";
    case 2:
      return "bg-yellow-100 text-yellow-800";
    case 3:
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Función para obtener el texto del estado
export const getEstadoText = (estado: number): string => {
  switch (estado) {
    case 0:
      return "Terminado";
    case 1:
      return "En Proceso";
    case 2:
      return "Pendiente Anulación";
    case 3:
      return "Anulado";
    default:
      return "Desconocido";
  }
}; 