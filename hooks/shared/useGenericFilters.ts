/* eslint-disable react-hooks/preserve-manual-memoization */
import { useState, useMemo, useEffect } from 'react';
export function useGenericFilters<T>(
  data: T[],
  options?: {
    searchFields?: (keyof T)[];
    initialPageSize?: number;
    initialSortBy?: string;
    initialSortOrder?: 'asc' | 'desc';
  }
) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(options?.initialPageSize || 10);
  const [sortBy, setSortBy] = useState(options?.initialSortBy || 'created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(options?.initialSortOrder || 'desc');

  const filteredData = useMemo(() => {
    let result = data;

    if (searchTerm.trim() && options?.searchFields) {
      const lowercasedFilter = searchTerm.toLowerCase();
      result = result.filter(item =>
        options.searchFields!.some(field => {
          const value = item[field];
          return typeof value === 'string' && value.toLowerCase().includes(lowercasedFilter);
        })
      );
    }

    if (filterStatus !== null && 'status' in (result[0] || {})) {
      result = result.filter((item: any) => item.status === filterStatus);
    }

    // Ordenamiento
    if (sortBy) {
      result = [...result].sort((a: any, b: any) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];

        // Manejar valores null/undefined
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sortOrder === 'asc' ? 1 : -1;
        if (bValue == null) return sortOrder === 'asc' ? -1 : 1;

        // ComparaciÃ³n de strings
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return sortOrder === 'asc' ? comparison : -comparison;
        }

        // ComparaciÃ³n numÃ©rica
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        }

        // ComparaciÃ³n de fechas
        if (aValue instanceof Date && bValue instanceof Date) {
          return sortOrder === 'asc'
            ? aValue.getTime() - bValue.getTime()
            : bValue.getTime() - aValue.getTime();
        }

        // Convertir strings de fecha a Date si es posible
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const aDate = new Date(aValue);
          const bDate = new Date(bValue);
          if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
            return sortOrder === 'asc'
              ? aDate.getTime() - bDate.getTime()
              : bDate.getTime() - aDate.getTime();
          }
        }

        // Fallback: comparaciÃ³n como strings
        const aStr = String(aValue);
        const bStr = String(bValue);
        const comparison = aStr.localeCompare(bStr);
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchTerm, filterStatus, options?.searchFields, sortBy, sortOrder]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterStatus, pageSize]);

  return {
    filteredData,
    paginatedData,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages
  };
}
