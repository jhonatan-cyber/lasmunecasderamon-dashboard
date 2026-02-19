import { useGenericFetch } from "../shared/useGenericFetch";

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
  const {
    data: anfitrionas,
    isLoading: loading,
    error,
    refetch: getAnfitrionasDisponibles,
  } = useGenericFetch<Anfitriona>("/api/anfitrionas/disponibles", {
    initialFetch: true,
    transform: (data) => (data.success ? data.data : []),
  });

  return {
    anfitrionas,
    loading,
    error,
    getAnfitrionasDisponibles,
    refetch: getAnfitrionasDisponibles, 
  };
}