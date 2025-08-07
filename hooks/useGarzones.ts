import { useState, useEffect } from "react";
import { User } from "@/types/user";

export const useGarzones = () => {
  const [garzones, setGarzones] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getGarzones = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("=== HOOK: Obteniendo garzones ===");
      const response = await fetch("/api/garzones");
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al cargar garzones: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
      console.log("=== HOOK GARZONES ===");
      console.log("Datos recibidos:", data);
      console.log("Garzones encontrados:", data.data?.length || 0);
      console.log("=========================");
      
      if (data.success) {
        setGarzones(data.data || []);
      } else {
        throw new Error(data.message || "Error al obtener garzones");
      }
    } catch (err) {
      console.error("Error al obtener garzones:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      setGarzones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getGarzones();
  }, []);

  return {
    garzones,
    loading,
    error,
    getGarzones,
  };
}; 