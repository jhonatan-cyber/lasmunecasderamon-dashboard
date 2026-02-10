import { useState, useMemo, useEffect } from 'react';

/**
 * Hook genérico para filtros, búsqueda y paginación
 * Consolida la lógica repetida de filtrado en múltiples hooks
 */
export function useGenericFilters<T>(
  data: T[],
  options?: {
    searchFields?: (keyof T)[];
    initialPageSize?: number;
  }
) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(options?.initialPageSize || 10);

  // Filtrar datos basado en búsqueda y estado
  const filteredData = useMemo(() => {
    let result = data;

    // Filtrar por término de búsqueda
    if (searchTerm.trim() && options?.searchFields) {
      const lowercasedFilter = searchTerm.toLowerCase();
      result = result.filter((item) =>
        options.searchFields!.some((field) => {
          const value = item[field];
          return (
            typeof value === 'string' &&
            value.toLowerCase().includes(lowercasedFilter)
          );
        })
      );
    }

    // Filtrar por estado (si el objeto tiene propiedad status)
    if (filterStatus !== null && 'status' in (result[0] || {})) {
      result = result.filter(
        (item: any) => item.status === filterStatus
      );
    }

    return result;
  }, [data, searchTerm, filterStatus, options?.searchFields]);

  // Calcular datos paginados
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  // Calcular total de páginas
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterStatus, pageSize]);

  return {
    // Datos
    filteredData,
    paginatedData,
    
    // Búsqueda
    searchTerm,
    setSearchTerm,
    
    // Filtros
    filterStatus,
    setFilterStatus,
    
    // Paginación
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
  };
}
