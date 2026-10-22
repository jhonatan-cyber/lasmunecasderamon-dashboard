'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { formatDateLabel } from '@/lib/utils/calendarUtils';
import logger from '@/lib/utils/logger';

export interface Service {
  id_servicio: number;
  codigo: string;
  tiempo: string;
  fecha_crea: string;
  precio_servicio: number;
  comision_usuario: number;
  habitacion: string;
  anfitriona: string;
  cliente: string;
  anfitrionaId: string;
  estado: number;
  habitacion_comision?: number;
}

export type SortDirection = 'asc' | 'desc';
export type StatusFilter = 'proceso' | 'finalizados';

export interface UseAnfitrionaServiciosReturn {
  services: Service[];
  loading: boolean;
  error: string;
  searchTerm: string;
  rowsPerPage: number;
  page: number;
  sortField: keyof Service;
  sortDirection: SortDirection;
  statusFilter: StatusFilter;

  totalServices: number;
  totalEarnings: number;
  serviciosEnProceso: number;
  serviciosFinalizados: number;
  serviciosAnulados: number;
  serviciosPausados: number;
  solicitudesAnulacion: number;
  paginatedServices: Service[];
  totalPages: number;

  setSearchTerm: (term: string) => void;
  setRowsPerPage: (rows: number) => void;
  setPage: (page: number) => void;
  setStatusFilter: (filter: StatusFilter) => void;
  handleSort: (field: keyof Service) => void;
  setSort: (field: keyof Service, direction: SortDirection) => void;
  fetchServices: () => Promise<void>;
}

export function useAnfitrionaServicios(enabled = true): UseAnfitrionaServiciosReturn {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Service>('fecha_crea');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('proceso');

  const fetchServices = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/services/user');
      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.data)) {
        setServices(
          (data.data || []).map((service: Service) => ({
            ...service,
            estado: Number(service.estado),
            comision_usuario: Number(service.comision_usuario || 0)
          }))
        );
      } else {
        throw new Error('No se pudieron cargar tus servicios.');
      }
    } catch (error) {
      logger.captureException(error, { context: 'AnfitrionaServiciosPageClient:fetchServices' });
      setError('No se pudieron cargar tus servicios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void fetchServices();
  }, [enabled, fetchServices]);

  const totalServices = services.length;
  const totalEarnings = services
    .filter(service => Number(service.estado) !== 0)
    .reduce((sum, service) => sum + Number(service.comision_usuario || 0), 0);
  const serviciosEnProceso = services.filter(service => service.estado === 2).length;
  const serviciosFinalizados = services.filter(service => service.estado === 1).length;
  const serviciosAnulados = services.filter(service => service.estado === 0).length;
  const serviciosPausados = services.filter(service => service.estado === 3).length;
  const solicitudesAnulacion = services.filter(service => service.estado === 4).length;

  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const isProceso = [2, 3, 4].includes(service.estado);
      const isFinalizado = [1, 0].includes(service.estado);

      if (statusFilter === 'proceso' && !isProceso) return false;
      if (statusFilter === 'finalizados' && !isFinalizado) return false;

      if (!searchTerm) return true;

      try {
        const date = formatDateLabel(service.fecha_crea);
        return (
          date.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (service.precio_servicio || 0).toString().includes(searchTerm) ||
          (service.codigo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (service.cliente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (service.habitacion || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
      } catch (error) {
        return false;
      }
    });
  }, [services, statusFilter, searchTerm]);

  const sortedServices = useMemo(() => {
    return [...filteredServices].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [filteredServices, sortField, sortDirection]);

  const paginatedServices = sortedServices.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.ceil(sortedServices.length / rowsPerPage) || 1;

  const setSort = (field: keyof Service, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
    setPage(1);
  };

  const handleSort = (field: keyof Service) => {
    setSort(field, sortField === field && sortDirection === 'asc' ? 'desc' : 'asc');
  };

  return {
    services,
    loading,
    error,
    searchTerm,
    rowsPerPage,
    page,
    sortField,
    sortDirection,
    statusFilter,
    totalServices,
    totalEarnings,
    serviciosEnProceso,
    serviciosFinalizados,
    serviciosAnulados,
    serviciosPausados,
    solicitudesAnulacion,
    paginatedServices,
    totalPages,
    setSearchTerm,
    setRowsPerPage,
    setPage,
    setStatusFilter,
    handleSort,
    setSort,
    fetchServices
  };
}
