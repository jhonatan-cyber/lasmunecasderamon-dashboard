import { useState, useEffect, useMemo } from 'react';
import { useGenericFetch } from '../shared/useGenericFetch';

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
  // Determinar endpoint según disponibilidad - memoizado para evitar cambios
  const endpoint = useMemo(
    () => (disponiblesOnly ? '/api/anfitrionas/disponibles' : '/api/users?anfitrionas=1'),
    [disponiblesOnly]
  );

  // Usar hook genérico para fetch
  const {
    data: anfitrionas,
    isLoading: loading,
    error,
    refetch: getAnfitrionas
  } = useGenericFetch<Anfitriona>(endpoint, {
    transform: result => (result.success ? result.data : [])
  });

  return {
    anfitrionas: anfitrionas || [],
    loading,
    error,
    getAnfitrionas
  };
}
