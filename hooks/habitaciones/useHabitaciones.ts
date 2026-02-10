import { useGenericFetch } from "../shared/useGenericFetch";

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
  comision_anfitriona?: number;
  estado?: number;
  status?: number;
}

export function useHabitaciones() {
  const {
    data: habitaciones,
    isLoading: loading,
    error,
    refetch: getHabitaciones,
  } = useGenericFetch<Habitacion>("/api/rooms", {
    initialFetch: true,
    transform: (data) => (data.success ? data.data : []),
  });

  return {
    habitaciones,
    loading,
    error,
    getHabitaciones,
  };
} 