import { useState, useEffect } from "react";

interface Anfitriona {
  id_usuario?: number;
  id?: number;
  nombre?: string;
  name?: string;
  apellido?: string;
  lastName?: string;
  nick?: string;
}

export function useAnfitrionas() {
  const [anfitrionas, setAnfitrionas] = useState<Anfitriona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAnfitrionas = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users?anfitrionas=1");
      const data = await response.json();

      if (data.success) {
        setAnfitrionas(data.data);
      } else {
        setError(data.message || "Error al cargar anfitrionas");
      }
    } catch (err) {
      setError("Error de conexión");
      console.error("Error al cargar anfitrionas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAnfitrionas();
  }, []);

  return {
    anfitrionas,
    loading,
    error,
    getAnfitrionas,
  };
} 