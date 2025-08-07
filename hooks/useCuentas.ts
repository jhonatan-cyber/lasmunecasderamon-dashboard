import { useState, useEffect } from "react";
import { Cuenta, CuentaWithDetails, CreateCuentaRequest, UpdateCuentaRequest } from "@/types/cuenta";

export const useCuentas = () => {
  const [cuentas, setCuentas] = useState<CuentaWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCuentas = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("=== HOOK: Iniciando fetch de cuentas ===");
      const response = await fetch("/api/cuentas");
      console.log("=== HOOK: Response status ===", response.status);
      console.log("=== HOOK: Response ok ===", response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log("=== HOOK: Error response ===", errorText);
        throw new Error(`Error al cargar las cuentas: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
      console.log("=== HOOK CUENTAS ===");
      console.log("Datos recibidos del API:", data);
      console.log("Tipo de datos:", typeof data);
      console.log("Es array:", Array.isArray(data));
      console.log("Longitud:", data ? data.length : "null/undefined");
      console.log("=========================");
      
      // Asegurar que data sea un array
      setCuentas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("=== HOOK: Error completo ===", err);
      console.error("=== HOOK: Mensaje de error ===", err instanceof Error ? err.message : "Error desconocido");
      setError(err instanceof Error ? err.message : "Error desconocido");
      setCuentas([]); // En caso de error, establecer array vacío
    } finally {
      setLoading(false);
    }
  };

  const createCuenta = async (cuentaData: CreateCuentaRequest) => {
    try {
      console.log("=== CREANDO NUEVA CUENTA ===");
      console.log("Datos a enviar:", cuentaData);

      const response = await fetch("/api/cuentas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cuentaData),
      });

      console.log("=== RESPUESTA CREAR CUENTA ===");
      console.log("Status:", response.status);
      console.log("OK:", response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error en respuesta:", errorData);
        throw new Error(errorData.message || "Error al crear la cuenta");
      }

      const result = await response.json();
      console.log("Resultado exitoso:", result);
      
      // Recargar la lista después de crear
      await getCuentas();
      
      return result;
    } catch (err) {
      console.error("Error al crear cuenta:", err);
      throw err;
    }
  };

  const updateCuenta = async (cuentaData: UpdateCuentaRequest) => {
    try {
      console.log("=== ACTUALIZANDO CUENTA ===");
      console.log("Datos a enviar:", cuentaData);

      const response = await fetch(`/api/cuentas/${cuentaData.id_cuenta}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cuentaData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al actualizar la cuenta");
      }

      const result = await response.json();
      console.log("Resultado exitoso:", result);
      
      // Recargar la lista después de actualizar
      await getCuentas();
      
      return result;
    } catch (err) {
      console.error("Error al actualizar cuenta:", err);
      throw err;
    }
  };

  const deleteCuenta = async (id: number) => {
    try {
      console.log("=== ELIMINANDO CUENTA ===");
      console.log("ID a eliminar:", id);

      const response = await fetch(`/api/cuentas/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al eliminar la cuenta");
      }

      const result = await response.json();
      console.log("Resultado exitoso:", result);
      
      // Recargar la lista después de eliminar
      await getCuentas();
      
      return result;
    } catch (err) {
      console.error("Error al eliminar cuenta:", err);
      throw err;
    }
  };

  const getCuentaById = async (id: number) => {
    try {
      const response = await fetch(`/api/cuentas/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al obtener la cuenta");
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Error al obtener cuenta por ID:", err);
      throw err;
    }
  };

  useEffect(() => {
    getCuentas();
  }, []);

  return {
    cuentas,
    loading,
    error,
    getCuentas,
    createCuenta,
    updateCuenta,
    deleteCuenta,
    getCuentaById,
  };
}; 