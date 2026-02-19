import { useState } from 'react';

export interface DevolucionFilters {
  searchTerm: string;
  paymentFilter: string;
  currentPage: number;
  rowsPerPage: number;
}

export const useDevolucionFilters = () => {
  const [filters, setFilters] = useState<DevolucionFilters>({
    searchTerm: '',
    paymentFilter: 'all',
    currentPage: 1,
    rowsPerPage: 10
  });

  const updateFilter = (key: keyof DevolucionFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      ...(key !== 'currentPage' && key !== 'rowsPerPage' ? { currentPage: 1 } : {})
    }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      paymentFilter: 'all',
      currentPage: 1,
      rowsPerPage: 10
    });
  };

  return { filters, updateFilter, clearFilters };
}; 