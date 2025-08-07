import { useState, useEffect } from "react";
import { 
  Venta, 
  VentaWithDetails, 
  VentaCreate, 
  VentaUpdate, 
  VentaResumen, 
  VentaFiltros 
} from "@/types/venta";
import { showErrorToast } from "@/lib/toastUtils";

export const useSales = () => {
  const [ventas, setVentas] = useState<VentaWithDetails[]>([]);
  const [resumen, setResumen] = useState<VentaResumen | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getVentas = async (filtros?: VentaFiltros) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filtros) {
        Object.entries(filtros).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const response = await fetch(`/api/sales?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Error al cargar ventas");
      }
      const data = await response.json();
      setVentas(data.data || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const getVentaById = async (id: number): Promise<VentaWithDetails | null> => {
    try {
      const response = await fetch(`/api/ventas/${id}`);
      if (!response.ok) {
        throw new Error("Error al cargar la venta");
      }
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      return null;
    }
  };

  const createVenta = async (ventaData: VentaCreate): Promise<any> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ventaData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.errorCode === "CAJA_CERRADA") {
          const errorMessage = errorData.message || "No se puede realizar la venta. No hay una caja abierta.";
          showErrorToast(errorMessage);
          throw new Error(errorMessage);
        }
        throw new Error(errorData.message || "Error al crear venta");
      }

      const nuevaVenta = await response.json();
      setVentas(prev => [nuevaVenta.data, ...prev]);
      return nuevaVenta;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage);
      
      if (!errorMessage.includes("caja abierta") && !errorMessage.includes("caja cerrada")) {
        showErrorToast("Error al generar la venta");
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateVenta = async (id: number, ventaData: VentaUpdate): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/ventas/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ventaData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al actualizar venta");
      }

      await getVentas();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage);
      showErrorToast("Error al actualizar la venta");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteVenta = async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/ventas/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al eliminar venta");
      }

      setVentas(prev => prev.filter(venta => venta.id_venta !== id));
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage);
      showErrorToast("Error al eliminar la venta");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getResumen = async (filtros?: VentaFiltros) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("tipo", "resumen");
      
      if (filtros) {
        Object.entries(filtros).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const response = await fetch(`/api/sales?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Error al cargar resumen de ventas");
      }
      const data = await response.json();
      setResumen(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const cancelarVenta = async (id: number, motivo?: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/ventas/${id}/solicitar-anulacion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ motivo }),
      });

      if (!response.ok) {
        throw new Error("Error al cancelar venta");
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      return false;
    }
  };

  const devolverVenta = async (id: number, motivo?: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/ventas/${id}/devolver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ motivo }),
      });

      if (!response.ok) {
        throw new Error("Error al devolver venta");
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      return false;
    }
  };

  const clearError = () => {
    setError(null);
  };

  // Escuchar eventos de actualización de ventas
  useEffect(() => {
    const handleUpdateSales = () => {
      console.log('🔄 Actualizando ventas desde notificación...');
      getVentas();
    };

    window.addEventListener('updateSales', handleUpdateSales);

    return () => {
      window.removeEventListener('updateSales', handleUpdateSales);
    };
  }, [getVentas]);

  return {
    ventas,
    resumen,
    loading,
    error,
    getVentas,
    getVentaById,
    createVenta,
    updateVenta,
    deleteVenta,
    getResumen,
    cancelarVenta,
    devolverVenta,
    clearError,
  };
}; 