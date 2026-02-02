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

export function useAnfitrionasDisponibles() {
  const [anfitrionas, setAnfitrionas] = useState<Anfitriona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAnfitrionasDisponibles = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/anfitrionas/disponibles");
      const data = await response.json();

      if (data.success) {
        setAnfitrionas(data.data);
        setError(null);
      } else {
        setError(data.message || "Error al cargar anfitrionas disponibles");
      }
    } catch (err) {
      setError("Error de conexión");
      console.error("Error al obtener anfitrionas disponibles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAnfitrionasDisponibles();
  }, []);

  return {
    anfitrionas,
    loading,
    error,
    getAnfitrionasDisponibles,
    refetch: getAnfitrionasDisponibles, // Alias para refrescar
  };
}