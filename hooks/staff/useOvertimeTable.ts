'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Overtime } from '@/types/overtime';

interface UseOvertimeTableProps {
  overtime: Overtime[];
}

export function useOvertimeTable({ overtime }: UseOvertimeTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('fecha_crea');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const processedData = useMemo(() => {
    let data = [...(overtime || [])];

    data = data.filter(item => {
      const matchesSearch =
        item.usuario.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
        item.motivo?.toLowerCase().includes(searchTerm.trim().toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'por_cobrar' && item.estado === 1) ||
        (statusFilter === 'cobrado' && item.estado === 0);

      return matchesSearch && matchesStatus;
    });

    const groupedMap = new Map<string, Overtime>();

    data.forEach(item => {
      const existing = groupedMap.get(item.id_usuario);
      if (existing) {
        existing.hora += Number(item.hora) || 0;
        existing.total += Number(item.total) || 0;

        if (new Date(item.fecha_crea) > new Date(existing.fecha_crea)) {
          existing.fecha_crea = item.fecha_crea;
        }
      } else {
        groupedMap.set(item.id_usuario, {
          ...item,
          hora: Number(item.hora) || 0,
          total: Number(item.total) || 0
        });
      }
    });

    const groupedData = Array.from(groupedMap.values());

    groupedData.sort((a, b) => {
      let aValue: any = a[sortBy as keyof typeof a];
      let bValue: any = b[sortBy as keyof typeof b];

      if (sortBy === 'fecha_crea' || sortBy === 'fecha_mod') {
        aValue = new Date(aValue || 0).getTime();
        bValue = new Date(bValue || 0).getTime();
      }

      if (aValue === bValue) return 0;
      if (sortOrder === 'asc') return aValue > bValue ? 1 : -1;
      return aValue < bValue ? 1 : -1;
    });

    return groupedData;
  }, [overtime, searchTerm, statusFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(processedData.length / pageSize) || 1;
  const currentPage = Math.min(totalPages, Math.max(1, page));
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, pageSize]);
  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [page, currentPage]);

  const paginatedData = useMemo(
    () => processedData.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [processedData, currentPage, pageSize]
  );

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortBy('fecha_crea');
    setSortOrder('desc');
    setPage(1);
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    pageSize,
    setPageSize: (size: number) => {
      if (Number.isInteger(size) && size > 0) setPageSize(size);
    },
    page: currentPage,
    setPage: (value: number) => {
      if (Number.isInteger(value) && value >= 1 && value <= totalPages) setPage(value);
    },

    processedData,
    paginatedData,
    totalPages,

    handleClearFilters
  };
}
