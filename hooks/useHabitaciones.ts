import { useState, useEffect } from "react";

interface Habitacion {
  id_habitacion?: number;
  id?: number;
  nombre?: string;
  name?: string;
  numero?: string;
  precio?: number;
  price?: number;
  tiempo?: number;
  time?: number;
  estado?: number;
  status?: number;
}

export function useHabitaciones() {
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getHabitaciones = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/rooms");
      const data = await response.json();

      if (data.success) {
        setHabitaciones(data.data);
      } else {
        setError(data.message || "Error al cargar habitaciones");
      }
    } catch (err) {
      setError("Error de conexión");
      console.error("Error al cargar habitaciones:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getHabitaciones();
  }, []);

  return {
    habitaciones,
    loading,
    error,
    getHabitaciones,
  };
} 