'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Landmark } from 'lucide-react';
import OvertimeStatsCards from '@/components/overtime/OvertimeStatsCards';
import OvertimeFilters from '@/components/overtime/OvertimeFilters';
import OvertimeTable from '@/components/overtime/OvertimeTable';
import Paginate from '@/components/shared/Paginate';

export default function CajeroHorasExtrasPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [overtime, setOvertime] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados de Filtros y Tabla
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('fecha_crea');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const fetchOvertime = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/overtime/user');
      const data = await res.json();
      if (data.success) {
        setOvertime(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching overtime:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !userLoading) {
      fetchOvertime();
    }
  }, [user, userLoading]);

  // Lógica de Filtrado y Ordenamiento
  const processedOvertime = useMemo(() => {
    const data = overtime || [];

    // 1. Filtrado
    const filtered = data.filter(item => {
      const matchesSearch =
        item.total?.toString().includes(searchTerm) || item.hora?.toString().includes(searchTerm);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'por_cobrar' && item.estado === 1) ||
        (statusFilter === 'cobrado' && item.estado === 0);
      return matchesSearch && matchesStatus;
    });

    // 2. Ordenamiento
    return [...filtered].sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      if (sortBy === 'fecha_crea' || sortBy === 'fecha_mod') {
        aValue = new Date(aValue || 0).getTime();
        bValue = new Date(bValue || 0).getTime();
      }

      if (sortOrder === 'asc') return aValue > bValue ? 1 : -1;
      return aValue < bValue ? 1 : -1;
    });
  }, [overtime, searchTerm, statusFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(processedOvertime.length / pageSize) || 1;
  const paginatedOvertime = processedOvertime.slice((page - 1) * pageSize, page * pageSize);

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortBy('fecha_crea');
    setSortOrder('desc');
    setPage(1);
  };

  if (userLoading) {
    return (
      <div className='p-6 flex items-center justify-center min-h-screen'>
        <div className='flex flex-col items-center gap-4'>
          <div className='h-12 w-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin' />
          <p className='font-black text-gray-400 uppercase tracking-tighter'>Cargando...</p>
        </div>
      </div>
    );
  }

  // Verificar que el usuario sea cajero
  if (user?.role?.toLowerCase() !== 'cajero') {
    return (
      <div className='p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4'>
        <div className='h-16 w-16 bg-red-100 rounded-3xl flex items-center justify-center'>
          <ArrowLeft className='h-8 w-8 text-red-600' />
        </div>
        <h1 className='text-2xl font-black text-gray-900 uppercase tracking-tight'>
          Acceso Denegado
        </h1>
        <p className='text-gray-500 font-medium'>No tienes permisos para acceder a esta área.</p>
        <Button onClick={() => router.back()} className='rounded-2xl bg-black text-white px-8'>
          Regresar
        </Button>
      </div>
    );
  }

  return (
    <div className='p-6 space-y-6'>
      {/* Header Premium */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6'>
        <div className='flex flex-col'>
          <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold'>Mis Horas Extras</h1>
          <div className='flex items-center gap-2 text-gray-600 font-medium'>
            <Landmark className='h-4 w-4 text-purple-500' />
            <span>
              Resumen personal de {user.name} {user.lastName}
            </span>
          </div>
        </div>

        <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => router.back()}
            className='whitespace-nowrap inline-flex items-center bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base px-4 sm:px-6 py-2 w-full sm:w-auto'
          >
            <ArrowLeft className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
            Atrás
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <OvertimeStatsCards overtime={overtime} />

      {/* Filtros Section */}
      <OvertimeFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        pageSize={pageSize}
        setPageSize={setPageSize}
        onClearFilters={handleClearFilters}
        loading={loading}
        isAdmin={false}
      />

      {/* Tabla Section */}
      <OvertimeTable
        loading={loading}
        rows={paginatedOvertime}
        pageSize={pageSize}
        isAdmin={false}
      />

      {/* Paginador Section */}
      {totalPages > 1 && (
        <div className='flex justify-center pt-4'>
          <Paginate page={page} totalPages={totalPages} setPage={setPage} />
        </div>
      )}
    </div>
  );
}
