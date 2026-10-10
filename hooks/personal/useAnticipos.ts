'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useCurrentUser } from '../auth/useCurrentUser';
import { useGenericFetch } from '../shared/useGenericFetch';

export interface Anticipo {
  id_anticipo: number | string;
  usuario_id: number | string;
  fecha_crea: string;
  fecha_mod: string;
  fecha_aprobacion?: string;
  fecha_entrega?: string;
  fecha_cobro?: string;
  monto: number;
  estado: number;
  nick: string;
  name: string;
  lastName: string;
  nombre?: string;
  apellido?: string;
  foto?: string;
  estado_texto?: string;
  entregado_por?: number | string;
  entregado_por_nombre?: string;
  entregado_por_apellido?: string;
}

export default function useAnticipos() {
  const { user } = useCurrentUser();
  const isAdmin = useMemo(() => {
    const role = user?.role?.toLowerCase();
    return !['garzon', 'anfitriona', 'cajero'].includes(role || '');
  }, [user?.role]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('fecha_crea');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const endpoint = useMemo(() => {
    return isAdmin ? '/api/anticipos' : '/api/anticipos/user';
  }, [isAdmin]);

  const {
    data: allAnticipos,
    isLoading,
    error,
    refetch
  } = useGenericFetch<Anticipo>(endpoint, {
    transform: result => (result.success ? result.data : Array.isArray(result) ? result : [])
  });

  const filteredData = useMemo(() => {
    let result = [...(allAnticipos || [])];

    if (searchTerm.trim()) {
      const lower = searchTerm.trim().toLowerCase();
      result = result.filter(
        item =>
          item.nick?.toLowerCase().includes(lower) ||
          item.name?.toLowerCase().includes(lower) ||
          item.lastName?.toLowerCase().includes(lower) ||
          item.nombre?.toLowerCase().includes(lower) ||
          item.apellido?.toLowerCase().includes(lower) ||
          String(item.monto).includes(lower)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(item => {
        if (statusFilter === 'por_cobrar') return Number(item.estado) === 1;
        return Number(item.estado) !== 1;
      });
    }

    result.sort((a, b) => {
      let valA: any = a[sortBy as keyof Anticipo];
      let valB: any = b[sortBy as keyof Anticipo];

      if (sortBy.includes('fecha')) {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [allAnticipos, searchTerm, statusFilter, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const currentPage = Math.min(
    totalPages,
    Math.max(1, Number.isFinite(page) ? Math.trunc(page) : 1)
  );
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);
  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [page, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  const fetchAnticipos = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const onClearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortBy('fecha_crea');
    setSortOrder('desc');
    setPage(1);
  }, []);

  const processAnticipo = useCallback(
    async (id: string | number, action: 'approve' | 'reject') => {
      try {
        const estado = action === 'approve' ? 1 : 3;
        const res = await fetch(`/api/anticipos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado })
        });
        const result = await res.json();
        if (res.ok && result.success) {
          toast.success(result.message || 'Procesado correctamente');
          await refetch();
          return true;
        } else {
          toast.error(result.message || 'Error al procesar');
          return false;
        }
      } catch (err) {
        toast.error('Error de red o servidor');
        return false;
      }
    },
    [refetch]
  );

  return {
    anticipos: paginatedData,
    allAnticipos,
    filteredAnticipos: filteredData,

    loading: isLoading,
    error,
    isAdmin,

    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,

    page: currentPage,
    setPage,
    pageSize,
    setPageSize,
    totalPages,

    fetchAnticipos,
    onClearFilters,
    processAnticipo
  };
}
import { toast } from 'sonner';
