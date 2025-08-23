"use client";

import { useEffect, useMemo, useState } from "react";

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
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros y paginación
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [rowsPerPage, setRowsPerPage] = useState<number>(5);
  const [page, setPage] = useState<number>(1);

  const fetchPayroll = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payroll");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Error");
      setRows(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, []);

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
    // data
    rows,
    loading,
    error,
    // filters
    roleFilter,
    setRoleFilter,
    searchTerm,
    setSearchTerm,
    rowsPerPage,
    setRowsPerPage,
    page,
    setPage,
    // derived
    filtered,
    paginated,
    totalPages,
    // actions
    fetchPayroll,
    clearFilters,
  };
}


