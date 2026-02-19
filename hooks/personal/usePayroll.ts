"use client";

import { useMemo, useState } from "react";
import { useGenericFetch } from "../shared/useGenericFetch";

export interface PayrollRow {
  id_usuario: number;
  rol: string;
  usuario: string;
  sueldos: number;
  aportes: number;
  ventas: number;
  servicios: number;
  anticipos: number;
  propinas: number;
  descuentos: number;
  total_horas: number;
  total_monto_horas: number;
  total: number;
}

export type RoleFilter = 'all' | 'anfitriona' | 'garzon' | 'cajero';

export default function usePayroll() {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [rowsPerPage, setRowsPerPage] = useState<number>(5);
  const [page, setPage] = useState<number>(1);

  const {
    data: rows,
    isLoading: loading,
    error,
    refetch: fetchPayroll,
  } = useGenericFetch<PayrollRow>("/api/payroll", {
    initialFetch: true,
    transform: (data) => (data.success ? data.data || [] : []),
  });

  const filtered = useMemo(() => {
    const byRole = rows.filter(r => {
      if (roleFilter === 'all') return true;
      const rolLower = (r.rol || '').toLowerCase();
      if (roleFilter === 'anfitriona') return rolLower.includes('anfitriona');
      if (roleFilter === 'garzon') return rolLower.includes('garzon');
      if (roleFilter === 'cajero') return rolLower.includes('cajero');
      return true;
    });
    const bySearch = byRole.filter(r =>
      searchTerm.trim() === '' || (r.usuario || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    return bySearch;
  }, [rows, roleFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const startIdx = (page - 1) * rowsPerPage;
  const endIdx = startIdx + rowsPerPage;
  const paginated = filtered.slice(startIdx, endIdx);

  const clearFilters = () => {
    setSearchTerm("");
    setRowsPerPage(5);
    setPage(1);
    setRoleFilter('all');
  };

  return {
    rows,
    loading,
    error,
    roleFilter,
    setRoleFilter,
    searchTerm,
    setSearchTerm,
    rowsPerPage,
    setRowsPerPage,
    page,
    setPage,
    filtered,
    paginated,
    totalPages,
    fetchPayroll,
    clearFilters,
  };
}


