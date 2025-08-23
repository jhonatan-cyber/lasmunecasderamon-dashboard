import { useState, useEffect } from "react";
import { User } from "@/types/user";

export const useEmployees = () => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("=== HOOK: Obteniendo empleados (garzones + cajeros) ===");
      const response = await fetch("/api/garzones");
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al cargar empleados: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
      console.log("=== HOOK EMPLOYEES ===");
      console.log("Datos recibidos:", data);
      console.log("Empleados encontrados:", data.data?.length || 0);
      console.log("=========================");
      
      if (data.success) {
        setEmployees(data.data || []);
      } else {
        throw new Error(data.message || "Error al obtener empleados");
      }
    } catch (err) {
      console.error("Error al obtener empleados:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getEmployees();
  }, []);

  return {
    employees,
    loading,
    error,
    getEmployees,
  };
};
