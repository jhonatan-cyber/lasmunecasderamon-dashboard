'use client';

import { useState, useMemo, useEffect } from 'react';

import { TooltipProvider } from '@/components/ui/tooltip';
import { useTipsResumen } from '@/hooks/useTips';
import PropinasDetalleModal from '@/components/propinas/PropinasDetalleModal';
import { PropinaResumen } from '@/types/propina';
import TipsTable from '@/components/propinas/TipsTable';
import TipsFilters from '@/components/propinas/TipsFilters';
import TipsStatsCards from '@/components/propinas/TipsStatsCards';
import Paginate from '@/components/ui/paginate';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

export default function TipsPage() {
  const { data: tips, loading, fetchTipsResumen } = useTipsResumen();
  const [selectedUsuario, setSelectedUsuario] = useState<PropinaResumen | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [tipsCajaActiva, setTipsCajaActiva] = useState<PropinaResumen[]>([]);

  const toNumber = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const fetchTipsCajaActiva = async () => {
    try {
      const response = await fetch('/api/tips?tipo=resumen&caja_activa=1');
      const result = await response.json();

      if (result?.success) {
        setTipsCajaActiva(result.data || []);
      } else {
        setTipsCajaActiva([]);
      }
    } catch {
      setTipsCajaActiva([]);
    }
  };


  // Filtrar datos por término de búsqueda
  const filteredTips = useMemo(() => {
    if (!tips) return [];

    return tips.filter((tip: any) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        tip.nombre_completo?.toLowerCase().includes(searchLower) ||
        tip.nick?.toLowerCase().includes(searchLower)
      );
    });
  }, [tips, searchTerm]);

  const filteredTipsCajaActiva = useMemo(() => {
    if (!tipsCajaActiva) return [];

    return tipsCajaActiva.filter((tip: any) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        tip.nombre_completo?.toLowerCase().includes(searchLower) ||
        tip.nick?.toLowerCase().includes(searchLower)
      );
    });
  }, [tipsCajaActiva, searchTerm]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    if (!filteredTips) {
      return {
        totalTips: 0,
        totalUsuarios: 0,
        tipsPorUsuario: 0
      };
    }

    const totalTips = filteredTips.reduce(
      (sum: number, tip: any) => sum + toNumber(tip.total_propinas),
      0
    );
    const totalUsuarios = filteredTips.length;
    const totalTipsCajaActiva = filteredTipsCajaActiva.reduce(
      (sum: number, tip: any) => sum + toNumber(tip.total_propinas),
      0
    );
    const totalUsuariosCajaActiva = filteredTipsCajaActiva.length;
    const tipsPorUsuario =
      totalUsuariosCajaActiva > 0
        ? Math.round(totalTipsCajaActiva / totalUsuariosCajaActiva)
        : 0;

    return {
      totalTips,
      totalUsuarios,
      tipsPorUsuario
    };
  }, [filteredTips, filteredTipsCajaActiva]);

  // Función para formatear moneda
  const formatCurrency = (n: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(n);
  };

  // Paginación
  const paginatedTips = filteredTips.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.ceil(filteredTips.length / rowsPerPage) || 1;

  const handleVerDetalle = (usuario: PropinaResumen) => {
    setSelectedUsuario(usuario);
    setIsModalOpen(true);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setRowsPerPage(10);
    setPage(1);
  };

  const handleRefresh = () => {
    fetchTipsResumen();
    fetchTipsCajaActiva();
  };

  useEffect(() => {
    fetchTipsCajaActiva();
  }, []);

  return (
    <PermissionGuard module="propinas" action="listar">
      <TooltipProvider>
      <div className='flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 lg:p-10 mt-4 sm:mt-6 lg:mt-10'>
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6'>
          <div>
            <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold'>Propinas</h1>
            <p className='text-sm sm:text-base text-gray-600'>
              Gestiona todas las propinas de los empleados.
            </p>
          </div>
        </div>

        {/* Estadísticas */}
        <TipsStatsCards
          totalTips={stats.totalTips}
          totalUsuarios={stats.totalUsuarios}
          tipsPorUsuario={stats.tipsPorUsuario}
          formatCurrency={formatCurrency}
        />

        {/* Filtros */}
        <TipsFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          setPage={setPage}
          loading={loading}
          onRefresh={handleRefresh}
        />

        {/* Lista de tips */}
        <div className='overflow-x-auto'>
          <TipsTable
            loading={loading}
            rows={paginatedTips}
            rowsPerPage={rowsPerPage}
            onVerDetalle={handleVerDetalle}
          />
        </div>
        {totalPages > 1 && (
          <div className='flex justify-center mt-4 sm:mt-6'>
            <Paginate page={page} totalPages={totalPages} setPage={setPage} />
          </div>
        )}
        {/* Modal de detalles */}
        <PropinasDetalleModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          usuario={selectedUsuario}
        />
      </div>
    </TooltipProvider>
    </PermissionGuard>
  );
}
