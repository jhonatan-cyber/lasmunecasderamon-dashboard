'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import useAsistencias from '@/hooks/useAsistencias';
import { useAttendanceStats } from '@/hooks/useAttendanceStats';
import AttendanceTable from '@/components/attendance/AttendanceTable';
import AttendanceFilters from '@/components/attendance/AttendanceFilters';
import AttendanceStatsCard from '@/components/attendance/AttendanceStatsCard';

export default function AttendancePage() {
  const router = useRouter();
  const { data, loading, error } = useAsistencias();
  const { stats: attendanceStats, loading: statsLoading, error: statsError } = useAttendanceStats();

  // Estados para filtros y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Filtrar y paginar datos
  const filteredData = useMemo(() => {
    if (!data) return [];

    return data.filter((item: any) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.nombre_completo?.toLowerCase().includes(searchLower) ||
        item.nick?.toLowerCase().includes(searchLower)
      );
    });
  }, [data, searchTerm]);

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, page, pageSize]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setPageSize(10);
    setPage(1);
  };

  // Usar estadísticas del hook basadas en el estado de la caja
  const stats = attendanceStats;

  return (
    <div className='flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 lg:p-10 mt-4 sm:mt-6 lg:mt-10'>
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6'>
        <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight'>Asistencias</h1>
        <Button
          variant='outline'
          onClick={() => router.back()}
          className='rounded-full bg-black text-white hover:scale-105 transition-all duration-200'
        >
          <ArrowLeft className='w-4 h-4 mr-2' />
          Atrás
        </Button>
      </div>

      {error ? (
        <Card className='shadow-sm'>
          <CardHeader className='pb-4'>
            <CardTitle className='text-lg sm:text-xl'>Error</CardTitle>
            <CardDescription className='text-sm sm:text-base'>
              Ocurrió un error al cargar los datos
            </CardDescription>
          </CardHeader>
          <CardContent className='p-4 sm:p-6'>
            <p className='text-sm sm:text-base text-red-500'>{error}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Estadísticas */}
          <AttendanceStatsCard stats={stats} isLoading={statsLoading} />

          {/* Filtros */}
          <AttendanceFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            pageSize={pageSize}
            setPageSize={setPageSize}
            page={page}
            setPage={setPage}
            totalItems={totalItems}
            totalPages={totalPages}
            onClearFilters={handleClearFilters}
          />

          {/* Tabla de asistencias */}
          <Card className='shadow-sm'>
            <CardHeader className='pb-4'>
              <CardTitle className='text-lg sm:text-xl'>Listado de Asistencias</CardTitle>
            </CardHeader>
            <CardContent className='p-4 sm:p-6'>
              <div className='overflow-x-auto'>
                <AttendanceTable data={paginatedData} />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
