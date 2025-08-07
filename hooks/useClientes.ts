import { useState, useEffect } from "react";

interface Cliente {
  id_cliente?: number;
  id?: number;
  nombre?: string;
  name?: string;
  apellido?: string;
  lastName?: string;
  run?: string;
}

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getClientes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/clients");
      const data = await response.json();

      if (response.ok) {
        // La API devuelve directamente el array de clientes
        if (Array.isArray(data)) {
          setClientes(data);
        } else if (data.success && Array.isArray(data.data)) {
          setClientes(data.data);
        } else {
          setError("Formato de respuesta inválido");
        }
      } else {
        setError(data.message || "Error al cargar clientes");
      }
    } catch (err) {
      setError("Error de conexión");
      console.error("Error al cargar clientes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getClientes();
  }, []);

  return {
    clientes,
    loading,
    error,
    getClientes,
  };
} 