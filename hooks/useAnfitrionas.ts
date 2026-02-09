import { useState, useEffect } from "react";

interface Anfitriona {
  id_usuario?: number;
  id?: number;
  nombre?: string;
  name?: string;
  apellido?: string;
  lastName?: string;
  nick?: string;
  estado?: number;
  status?: number;
}

export function useAnfitrionas(disponiblesOnly: boolean = false) {
  const [anfitrionas, setAnfitrionas] = useState<Anfitriona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAnfitrionas = async () => {
    try {
      setLoading(true);
      // Si disponiblesOnly es true, usar el endpoint que excluye ocupadas
      const endpoint = disponiblesOnly 
        ? "/api/anfitrionas/disponibles" 
        : "/api/users?anfitrionas=1";
      
      const response = await fetch(endpoint);
      const data = await response.json();

      if (data.success) {
        setAnfitrionas(data.data);
      } else {
        setError(data.message || "Error al cargar anfitrionas");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAnfitrionas();
  }, [disponiblesOnly]);

  return {
    anfitrionas,
    loading,
    error,
    getAnfitrionas,
  };
} 