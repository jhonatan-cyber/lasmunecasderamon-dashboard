'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useTipsResumen } from '@/hooks/useTips';
import PropinasDetalleModal from '@/components/propinas/PropinasDetalleModal';
import { PropinaResumen } from '@/types/propina';
import TipsTable from '@/components/propinas/TipsTable';
import TipsFilters from '@/components/propinas/TipsFilters';
import TipsStatsCards from '@/components/propinas/TipsStatsCards';
import Paginate from '@/components/ui/paginate';

export default function TipsPage() {
  const router = useRouter();
  const { data: tips, loading, fetchTipsResumen } = useTipsResumen();
  const [selectedUsuario, setSelectedUsuario] = useState<PropinaResumen | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);

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

  // Calcular estadísticas
  const stats = useMemo(() => {
    if (!filteredTips) {
      return {
        totalTips: 0,
        totalUsuarios: 0,
        maxTip: 0
      };
    }

    const totalTips = filteredTips.reduce((sum: number, tip: any) => sum + (tip.total_propinas || 0), 0);
    const totalUsuarios = filteredTips.length;
    const maxTip = Math.max(...filteredTips.map((tip: any) => tip.total_propinas || 0), 0);

    return {
      totalTips,
      totalUsuarios,
      maxTip
    };
  }, [filteredTips]);

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
  };

  return (
    <TooltipProvider>
    <div className='flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 lg:p-10 mt-4 sm:mt-6 lg:mt-10'>
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6'>
          <div>
            <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold'>Propinas</h1>
            <p className='text-sm sm:text-base text-gray-600'>Gestiona todas las propinas de los empleados.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="rounded-full bg-black text-white hover:scale-105 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Atrás
          </Button>
        </div>

        {/* Estadísticas */}
        <TipsStatsCards
          totalTips={stats.totalTips}
          totalUsuarios={stats.totalUsuarios}
          maxTip={stats.maxTip}
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
  );
}
