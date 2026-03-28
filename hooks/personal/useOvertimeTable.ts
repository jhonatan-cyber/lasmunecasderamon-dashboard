"use client";

import { useState, useMemo, useCallback } from 'react';
import { Overtime } from '@/types/overtime';

interface UseOvertimeTableProps {
  overtime: Overtime[];
}

export function useOvertimeTable({ overtime }: UseOvertimeTableProps) {
  // --- ESTADOS DE FILTROS Y TABLA ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('fecha_crea');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // --- LÓGICA DE PROCESAMIENTO (FILTRADO, ORDENAMIENTO, PAGINACIÓN) ---
  const processedData = useMemo(() => {
    let data = [...(overtime || [])];

    // 1. Filtrado
    data = data.filter(item => {
      const matchesSearch = 
        item.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.motivo?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'por_cobrar' && item.estado === 1) ||
        (statusFilter === 'cobrado' && item.estado === 0);
        
      return matchesSearch && matchesStatus;
    });

    // 2. Agrupación por Usuario
    const groupedMap = new Map<string, Overtime>();
    
    data.forEach(item => {
      const existing = groupedMap.get(item.id_usuario);
      if (existing) {
        existing.hora += item.hora;
        existing.total += item.total;
        // Mantener la fecha más reciente
        if (new Date(item.fecha_crea) > new Date(existing.fecha_crea)) {
          existing.fecha_crea = item.fecha_crea;
        }
      } else {
        // Clonar para no mutar el original
        groupedMap.set(item.id_usuario, { ...item });
      }
    });

    const groupedData = Array.from(groupedMap.values());

    // 3. Ordenamiento
    groupedData.sort((a, b) => {
      let aValue: any = a[sortBy as keyof typeof a];
      let bValue: any = b[sortBy as keyof typeof b];

      if (sortBy === 'fecha_crea' || sortBy === 'fecha_mod') {
        aValue = new Date(aValue || 0).getTime();
        bValue = new Date(bValue || 0).getTime();
      }

      if (sortOrder === 'asc') return aValue > bValue ? 1 : -1;
      return aValue < bValue ? 1 : -1;
    });

    return groupedData;
  }, [overtime, searchTerm, statusFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(processedData.length / pageSize) || 1;
  
  const paginatedData = useMemo(() => 
    processedData.slice((page - 1) * pageSize, page * pageSize),
    [processedData, page, pageSize]
  );

  // --- HANDLERS ---
  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortBy('fecha_crea');
    setSortOrder('desc');
    setPage(1);
  }, []);

  return {
    // States
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    pageSize,
    setPageSize,
    page,
    setPage,
    
    // Computed
    processedData,
    paginatedData,
    totalPages,
    
    // Handlers
    handleClearFilters
  };
}
