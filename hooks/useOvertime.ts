import { useState, useEffect } from "react";
import { Overtime, CreateOvertimeRequest } from "@/types/overtime";

export const useOvertime = () => {
  const [overtime, setOvertime] = useState<Overtime[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getOvertime = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("=== HOOK: Iniciando fetch ===");
      const response = await fetch("/api/overtime");
      console.log("=== HOOK: Response status ===", response.status);
      console.log("=== HOOK: Response ok ===", response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log("=== HOOK: Error response ===", errorText);
        throw new Error(`Error al cargar las horas extras: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
      console.log("=== HOOK HORAS EXTRAS ===");
      console.log("Datos recibidos del API:", data);
      console.log("Tipo de datos:", typeof data);
      console.log("Es array:", Array.isArray(data));
      console.log("Longitud:", data ? data.length : "null/undefined");
      console.log("=========================");
      
      // Asegurar que data sea un array
      setOvertime(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("=== HOOK: Error completo ===", err);
      console.error("=== HOOK: Mensaje de error ===", err instanceof Error ? err.message : "Error desconocido");
      setError(err instanceof Error ? err.message : "Error desconocido");
      setOvertime([]); // En caso de error, establecer array vacío
    } finally {
      setLoading(false);
    }
  };

  const createOvertime = async (overtimeData: CreateOvertimeRequest) => {
    try {
      console.log("=== CREANDO HORA EXTRA ===");
      console.log("Datos a enviar:", overtimeData);

      const response = await fetch("/api/overtime", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(overtimeData),
      });

      console.log("=== RESPUESTA CREAR HORA EXTRA ===");
      console.log("Status:", response.status);
      console.log("OK:", response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error en respuesta:", errorData);
        throw new Error(errorData.message || "Error al crear la hora extra");
      }

      const result = await response.json();
      console.log("Resultado exitoso:", result);
      
      // Recargar la lista después de crear
      await getOvertime();
      
      return result;
    } catch (err) {
      console.error("Error al crear hora extra:", err);
      throw err;
    }
  };

  useEffect(() => {
    getOvertime();
  }, []);

  return {
    overtime,
    loading,
    error,
    getOvertime,
    createOvertime,
  };
};