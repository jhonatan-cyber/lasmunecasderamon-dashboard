import { useState, useEffect, useCallback } from "react";
import { ServicioWithDetails } from "@/types/servicio";

export function useServicios() {
  const [servicios, setServicios] = useState<ServicioWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getServicios = useCallback(async () => {
    try {
      setLoading(true);
      // Cargar todos los servicios sin filtro de estado
      const url = "/api/servicios";
      console.log(`📡 Hook useServicios: Obteniendo datos desde ${url}`);
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        // Solo mostrar logs en desarrollo
        if (process.env.NODE_ENV === 'development') {
          console.log(`📊 Hook useServicios: Datos obtenidos - ${data.data.length} servicios`);
          console.log(`📊 Hook useServicios: URL consultada: ${url}`);
          data.data.forEach((servicio: any) => {
            console.log(`  • Servicio ${servicio.codigo} (ID: ${servicio.id_servicio}): estado = ${servicio.estado}`);
          });
          
          // Mostrar resumen de estados
          const estados = data.data.reduce((acc: any, servicio: any) => {
            acc[servicio.estado] = (acc[servicio.estado] || 0) + 1;
            return acc;
          }, {});
          console.log(`📊 Resumen de estados:`, estados);
        }
        setServicios(data.data);
      } else {
        setError(data.message || "Error al cargar servicios");
      }
    } catch (err) {
      setError("Error de conexión");
      console.error("Error al cargar servicios:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createServicio = useCallback(async (servicioData: any) => {
    try {
      const response = await fetch("/api/servicios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(servicioData),
      });

      const data = await response.json();

      if (data.success) {
        await getServicios(); // Recargar la lista
        return { success: true, data: data.data };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      console.error("Error al crear servicio:", err);
      return { success: false, message: "Error de conexión" };
    }
  }, [getServicios]);

  const getServicioById = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/servicios/${id}`);
      const data = await response.json();

      if (data.success) {
        return { success: true, data: data.data };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      console.error("Error al obtener servicio:", err);
      return { success: false, message: "Error de conexión" };
    }
  }, []);

  const updateServicio = useCallback(async (id: number, servicioData: any) => {
    try {
      const response = await fetch(`/api/servicios/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(servicioData),
      });

      const data = await response.json();

      if (data.success) {
        await getServicios(); // Recargar la lista
        return { success: true, data: data.data };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      console.error("Error al actualizar servicio:", err);
      return { success: false, message: "Error de conexión" };
    }
  }, [getServicios]);

  const deleteServicio = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/servicios/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        await getServicios(); // Recargar la lista
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      console.error("Error al eliminar servicio:", err);
      return { success: false, message: "Error de conexión" };
    }
  }, [getServicios]);

  const removeServicioFromState = useCallback((id: number) => {
    setServicios(prev => prev.filter(servicio => servicio.id_servicio !== id));
  }, []);

  useEffect(() => {
    // Cargar todos los servicios al inicio
    getServicios();
  }, [getServicios]);

  return {
    servicios,
    loading,
    error,
    getServicios,
    createServicio,
    getServicioById,
    updateServicio,
    deleteServicio,
    removeServicioFromState,
  };
} 