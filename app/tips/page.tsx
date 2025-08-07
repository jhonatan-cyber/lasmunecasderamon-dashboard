'use client';

import { useState } from 'react';

import { TooltipProvider } from '@/components/ui/tooltip';
import { useTipsResumen } from '@/hooks/useTips';
import { formatCurrencyNoDecimals } from '@/lib/formatters';
import PropinasDetalleModal from '@/components/propinas/PropinasDetalleModal';
import { PropinaResumen } from '@/types/propina';
import TipsFilters from '@/components/propinas/TipsFilters';
import TipsStatsCards from '@/components/propinas/TipsStatsCards';
import TipsTable from '@/components/propinas/TipsTable';
import Paginate from '@/components/ui/paginate';

export default function TipsPage() {
  const { tips, loading, getTips } = useTipsResumen();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsuario, setSelectedUsuario] = useState<PropinaResumen | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);

  const filteredTips = tips.filter(tip => {
    const fullName = `${tip.nombre} ${tip.apellido}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  // Paginación simple (solo frontend)
  const paginatedTips = filteredTips.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleVerDetalle = (usuario: PropinaResumen) => {
    setSelectedUsuario(usuario);
    setIsModalOpen(true);
  };

  const totalTips = tips.reduce((acc, t) => acc + t.total, 0);
  const totalUsuarios = tips.length;
  const maxTip = tips.length > 0 ? Math.max(...tips.map(t => t.total)) : 0;

  const totalPages = Math.ceil(filteredTips.length / rowsPerPage) || 1;

  return (
    <TooltipProvider>
      <div className='container mx-auto py-4 sm:py-6 px-4 sm:px-6 mt-4 sm:mt-6 lg:mt-10'>
        <div className='flex flex-col mb-4 sm:mb-6'>
          <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold'>Propinas</h1>
          <p className='text-sm sm:text-base text-gray-600'>Gestiona todas las propinas de los empleados.</p>
        </div>
        <TipsStatsCards
          totalTips={totalTips}
          totalUsuarios={totalUsuarios}
          maxTip={maxTip}
          formatCurrency={formatCurrencyNoDecimals}
        />
        {/* Filtros y búsqueda */}
        <TipsFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          setPage={setPage}
          loading={loading}
          onRefresh={getTips}
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
