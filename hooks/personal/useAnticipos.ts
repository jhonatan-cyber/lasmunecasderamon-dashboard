'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useCurrentUser } from '../auth/useCurrentUser'
import { useGenericFetch } from '../shared/useGenericFetch'

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
  nombre?: string; // Fallback
  apellido?: string; // Fallback
  foto?: string;
  estado_texto?: string;
  entregado_por?: number | string;
  entregado_por_nombre?: string;
  entregado_por_apellido?: string;
}

export default function useAnticipos() {
  const { user } = useCurrentUser()
  const isAdmin = useMemo(() => {
    const role = user?.role?.toLowerCase();
    return !['garzon', 'anfitriona', 'cajero'].includes(role || '');
  }, [user?.role]);
  
  // --- Filtros ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('fecha_crea');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // --- Paginación ---
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const endpoint = useMemo(() => {
    return isAdmin ? '/api/anticipos' : '/api/anticipos/user';
  }, [isAdmin]);
  
  const { data: allAnticipos, isLoading, error, refetch } = useGenericFetch<Anticipo>(
    endpoint,
    {
      transform: (result) => result.success ? result.data : (Array.isArray(result) ? result : [])
    }
  )

  // --- Lógica de Filtrado y Búsqueda ---
  const filteredData = useMemo(() => {
    let result = [...(allAnticipos || [])];
    
    // 1. Búsqueda por texto (Nombre usuario, Nick o monto)
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.nick?.toLowerCase().includes(lower) ||
        item.name?.toLowerCase().includes(lower) ||
        item.lastName?.toLowerCase().includes(lower) ||
        item.nombre?.toLowerCase().includes(lower) ||
        item.apellido?.toLowerCase().includes(lower) ||
        String(item.monto).includes(lower)
      );
    }
    
    // 2. Filtro por estado
    if (statusFilter !== 'all') {
      const targetState = statusFilter === 'por_cobrar' ? 1 : 2; // 1: Por cobrar, 2+: Pagado
      result = result.filter(item => {
        if (statusFilter === 'por_cobrar') return Number(item.estado) === 1;
        return Number(item.estado) !== 1;
      });
    }

    // 3. Ordenamiento
    result.sort((a, b) => {
      let valA: any = a[sortBy as keyof Anticipo];
      let valB: any = b[sortBy as keyof Anticipo];
      
      // Manejo de fechas
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

  // --- Lógica de Paginación ---
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  // Resetear página al cambiar filtros
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

  const processAnticipo = useCallback(async (id: string | number, action: 'approve' | 'reject') => {
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
  }, [refetch]);

  return {
    // Datos
    anticipos: paginatedData,
    allAnticipos,
    filteredAnticipos: filteredData,
    
    // Estados
    loading: isLoading,
    error,
    isAdmin,
    
    // Filtros
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    
    // Paginación
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    
    // Acciones
    fetchAnticipos,
    onClearFilters,
    processAnticipo
  };
}
import { toast } from 'sonner'
