'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useAsistencias, useAttendanceStats, useUsers } from '@/hooks/personal';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { ReportSkeleton } from '@/components/shared/Skeletons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PersonnelGrid } from '@/components/attendance/PersonnelGrid';
import { QrCodeDialog } from '@/components/attendance/QrCodeDialog';

const AttendanceTable = dynamic(() => import('@/components/attendance/AttendanceTable'), {
  loading: () => <div className='h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse' />,
  ssr: false
});
const AttendanceFilters = dynamic(() => import('@/components/attendance/AttendanceFilters'), {
  loading: () => <div className='h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse' />,
  ssr: false
});
const AttendanceStatsCard = dynamic(() => import('@/components/attendance/AttendanceStatsCard'), {
  loading: () => <div className='h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse' />,
  ssr: false
});
const AsistenciaForm = dynamic(() => import('@/components/attendance/AsistenciaForm'), {
  ssr: false
});

export default function AttendancePage() {
  const { data, loading, error, fetchAsistencias } = useAsistencias();
  const { stats: attendanceStats, loading: statsLoading } = useAttendanceStats();
  const { users, isLoading: usersLoading } = useUsers();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('nombre_completo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedUserForQR, setSelectedUserForQR] = useState<any | null>(null);
  const [asistenciaFormOpen, setAsistenciaFormOpen] = useState(false);

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

  const sortedData = useMemo(() => {
    const list = [...filteredData];
    const compareValues = (a: any, b: any) => {
      if (a == null && b == null) return 0;
      if (a == null) return 1;
      if (b == null) return -1;
      if (typeof a === 'number' || typeof b === 'number') return Number(a) - Number(b);
      return String(a).localeCompare(String(b), 'es', { sensitivity: 'base' });
    };
    list.sort((a: any, b: any) => {
      const aVal = a?.[sortBy as keyof typeof a];
      const bVal = b?.[sortBy as keyof typeof b];
      const base = compareValues(aVal, bVal);
      return sortOrder === 'asc' ? base : -base;
    });
    return list;
  }, [filteredData, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = useMemo(
    () => sortedData.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize),
    [sortedData, page, pageSize]
  );

  const activePersonnel = useMemo(
    () =>
      users?.filter(
        u => u.status === 1 && !['administrador', 'admin'].includes(u.role?.toLowerCase())
      ) ?? [],
    [users]
  );

  if (loading || statsLoading || usersLoading) return <ReportSkeleton />;

  const handleClearFilters = () => {
    setSearchTerm('');
    setPageSize(10);
    setPage(1);
    setSortBy('nombre_completo');
    setSortOrder('asc');
  };

  return (
    <PermissionGuard module='attendance' action='view'>
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 mb-6'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight text-slate-900 dark:text-white'>
              Asistencias
            </h1>
            <p className='text-gray-600 dark:text-neutral-300 mt-1'>
              Administra la asistencia del personal
            </p>
          </div>
          <Button
            onClick={() => setAsistenciaFormOpen(true)}
            size='sm'
            className='w-full sm:w-auto justify-center rounded-full px-4 sm:px-6 py-2 bg-black text-white hover:bg-white hover:text-black hover:scale-105 transition-all duration-200 text-sm sm:text-base border-2 dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white'
          >
            <Plus className='w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2' />
            Registrar Manual
          </Button>
        </div>

        <AttendanceStatsCard stats={attendanceStats} isLoading={statsLoading} />

        <AttendanceFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterRole={filterRole}
          setFilterRole={setFilterRole}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          pageSize={pageSize}
          setPageSize={setPageSize}
          setPage={setPage}
          onClearFilters={handleClearFilters}
        />

        <Tabs defaultValue='history' className='w-full'>
          <TabsList className='grid w-full grid-cols-2 mb-6 p-1 rounded-full max-w-md mx-auto border border-gray-200 dark:border-slate-700 shadow-sm'>
            <TabsTrigger
              value='history'
              className='rounded-full data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black transition-all font-bold text-xs uppercase tracking-wider'
            >
              Historial de Asistencias
            </TabsTrigger>
            <TabsTrigger
              value='personnel'
              className='rounded-full data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black transition-all font-bold text-xs uppercase tracking-wider'
            >
              Personal
            </TabsTrigger>
          </TabsList>

          <TabsContent value='history'>
            <div className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl overflow-hidden'>
              <div className='overflow-x-auto'>
                <AttendanceTable data={paginatedData} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value='personnel'>
            <PersonnelGrid personnel={activePersonnel} onSelect={setSelectedUserForQR} />
          </TabsContent>
        </Tabs>

        {error && (
          <div className='p-4 bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-200 dark:border-red-800'>
            <p className='font-semibold text-red-700 dark:text-red-400 text-sm'>
              Error al cargar datos
            </p>
            <p className='text-red-600 dark:text-red-300 text-xs mt-1'>{error}</p>
          </div>
        )}
      </div>

      <QrCodeDialog selectedUser={selectedUserForQR} onClose={() => setSelectedUserForQR(null)} />

      <AsistenciaForm
        isOpen={asistenciaFormOpen}
        onOpenChange={setAsistenciaFormOpen}
        onSuccess={fetchAsistencias}
      />
    </PermissionGuard>
  );
}
