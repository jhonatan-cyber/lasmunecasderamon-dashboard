import { useState, useMemo, useEffect } from 'react';
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

  const filteredData = useMemo(() => {
    let result = data;

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

    if (filterStatus !== null && 'status' in (result[0] || {})) {
      result = result.filter(
        (item: any) => item.status === filterStatus
      );
    }

    return result;
  }, [data, searchTerm, filterStatus, options?.searchFields]);

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
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
  };
}
