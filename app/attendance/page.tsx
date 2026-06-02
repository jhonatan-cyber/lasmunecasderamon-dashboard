/* eslint-disable */
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAsistencias } from '@/hooks/personal';
import { useAttendanceStats } from '@/hooks/personal';
import AttendanceTable from '@/components/attendance/AttendanceTable';
import AttendanceFilters from '@/components/attendance/AttendanceFilters';
import AttendanceStatsCard from '@/components/attendance/AttendanceStatsCard';
import AsistenciaForm from '@/components/attendance/AsistenciaForm';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { ReportSkeleton } from '@/components/shared/Skeletons';
import { LazyQRCode } from '@/components/shared/LazyQRCode';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUsers } from '@/hooks/personal';
import { Badge } from '@/components/ui/badge';
import logger from '@/lib/utils/logger';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { RefreshCw, UserPlus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AttendancePage() {
  const { data, loading, error, fetchAsistencias } = useAsistencias();
  const { stats: attendanceStats, loading: statsLoading, error: statsError } = useAttendanceStats();
  const { users, isLoading: usersLoading } = useUsers();

  // Estados para filtros y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('nombre_completo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedUserForQR, setSelectedUserForQR] = useState<any | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [codigoAsistencia, setCodigoAsistencia] = useState<string>('');
  const [asistenciaFormOpen, setAsistenciaFormOpen] = useState(false);

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

  const sortedData = useMemo(() => {
    const list = [...filteredData];
    const compareValues = (a: any, b: any) => {
      if (a == null && b == null) return 0;
      if (a == null) return 1;
      if (b == null) return -1;

      if (typeof a === 'number' || typeof b === 'number') {
        return Number(a) - Number(b);
      }

      return String(a).localeCompare(String(b), 'es', { sensitivity: 'base' });
    };

    list.sort((a: any, b: any) => {
      const aValue = a?.[sortBy as keyof typeof a];
      const bValue = b?.[sortBy as keyof typeof b];
      const baseResult = compareValues(aValue, bValue);
      return sortOrder === 'asc' ? baseResult : -baseResult;
    });

    return list;
  }, [filteredData, sortBy, sortOrder]);

  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, page, pageSize]);

  const activePersonnel = useMemo(() => {
    if (!users) return [];
    return users.filter(
      user =>
        user.status === 1 &&
        user.role?.toLowerCase() !== 'administrador' &&
        user.role?.toLowerCase() !== 'admin'
    );
  }, [users]);

  // Escuchar cambios en tiempo real via SSE (sin polling)
  useEffect(() => {
    if (!selectedUserForQR) return;
    const fetchCodigo = async () => {
      try {
        const res = await fetch('/api/codigo/actual');
        const data = await res.json();
        if (data.success) setCodigoAsistencia(data.codigo);
      } catch {}
    };
    fetchCodigo();

    const es = new EventSource('/api/notifications/sse');
    es.onmessage = event => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'code_changed' && payload.data?.codigo) {
          setCodigoAsistencia(payload.data.codigo);
        }
      } catch {}
    };

    return () => {
      es.close();
    };
  }, [selectedUserForQR?.id]);

  // Polling para actualización del QR en tiempo real
  useEffect(() => {
    if (!selectedUserForQR) return;

    const checkQR = async () => {
      try {
        const res = await fetch(`/api/users/${selectedUserForQR.id}`);
        const data = await res.json();
        if (data.success && data.user && data.user.qr_token !== selectedUserForQR.qr_token) {
          setSelectedUserForQR(data.user);
        }
      } catch (e) {
        logger.captureException(e, { context: 'Attendance:checkQR' });
      }
    };

    const interval = setInterval(checkQR, 15000); // Polling cada 15 segundos

    window.addEventListener('focus', checkQR);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkQR);
    };
  }, [selectedUserForQR?.id, selectedUserForQR?.qr_token]);

  if (loading || statsLoading || usersLoading) return <ReportSkeleton />;

  const handleClearFilters = () => {
    setSearchTerm('');
    setPageSize(10);
    setPage(1);
    setSortBy('nombre_completo');
    setSortOrder('asc');
  };

  const handleGenerateQR = async (userId: string) => {
    try {
      setIsGeneratingToken(true);
      const response = await fetch('/api/users/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Token QR generado con éxito');

        // Actualizar el usuario seleccionado localmente
        setSelectedUserForQR((prev: any) =>
          prev && prev.id === userId ? { ...prev, qr_token: result.qr_token } : prev
        );
      } else {
        toast.error(result.message || 'Error al generar el token');
      }
    } catch (err) {
      toast.error('Ocurrió un error inesperado');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // Usar estadísticas del hook basadas en el estado de la caja
  const stats = attendanceStats;

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
            {/* Estadísticas (Globales) */}
            <AttendanceStatsCard stats={stats} isLoading={statsLoading} />

            {/* Filtros (Globales o afectan al menos la tabla principal) */}
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

              <TabsContent value='history' className='space-y-6'>
                {/* Tabla de asistencias */}
                <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl overflow-hidden'>
                  <CardContent className='p-0 sm:p-0'>
                    <div className='overflow-x-auto'>
                      <AttendanceTable data={paginatedData} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value='personnel'>
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
                  {activePersonnel.map(person => (
                    <Card
                      key={person.id}
                      className='group relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer'
                      onClick={() => setSelectedUserForQR(person)}
                    >
                      {/* Background */}
                      <div className='absolute inset-0'>
                        <img
                          src={person.foto ? `/img/users/${person.foto}` : `/placeholder-user.jpg`}
                          alt={`${person.name} ${person.lastName}`}
                          className='h-full w-full object-cover transition-all duration-500 group-hover:scale-105'
                          onError={e => {
                            e.currentTarget.src = '/placeholder-user.jpg';
                          }}
                        />
                        <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity' />
                      </div>

                      {/* Content */}
                      <div className='relative h-[280px] flex flex-col justify-end p-5'>
                        <div className='transform translate-y-2 group-hover:translate-y-0 transition-all duration-300'>
                          <h3 className='text-2xl font-black text-white leading-tight tracking-tight uppercase drop-shadow-lg'>
                            {person.name}
                            <span className='block text-slate-300 font-bold'>
                              {person.lastName}
                            </span>
                          </h3>

                          <div className='flex items-center justify-between mt-3 gap-2'>
                            <div className='flex flex-col'>
                              <span className='text-[9px] font-black text-slate-400 uppercase tracking-widest'>
                                Username
                              </span>
                              <span className='text-sm font-bold text-white'>@{person.nick}</span>
                            </div>
                            <Badge className='bg-white/20 backdrop-blur-sm text-white font-black text-[10px] px-3 py-1.5 rounded-xl border border-white/20 uppercase tracking-wider'>
                              {person.role}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {activePersonnel.length === 0 && (
                  <div className='text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700'>
                    <p className='text-slate-500'>No se encontró personal activo registrado.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      <Dialog open={!!selectedUserForQR} onOpenChange={open => !open && setSelectedUserForQR(null)}>
        <DialogContent className='w-[92vw] max-w-sm sm:max-w-md max-h-[90vh] overflow-y-auto bg-slate-950 border-slate-800 text-white'>
          <DialogHeader>
            <DialogTitle className='text-lg sm:text-xl font-black uppercase tracking-tight text-white'>
              Código QR de Asistencia
            </DialogTitle>
            <DialogDescription className='text-slate-400 text-xs sm:text-sm'>
              Muestra este código a la app móvil para registrar la asistencia de{' '}
              {selectedUserForQR?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className='p-3 bg-white rounded-2xl'>
            {selectedUserForQR?.qr_token ? (
              <LazyQRCode
                value={selectedUserForQR.qr_token}
                size={220}
                style={{ width: '100%', height: 'auto' }}
                level='H'
                includeMargin={true}
                fgColor={
                  selectedUserForQR.role?.toLowerCase().includes('anfitriona')
                    ? '#E11D48'
                    : selectedUserForQR.role?.toLowerCase().includes('garzon')
                      ? '#F97316'
                      : '#4F46E5'
                }
                imageSettings={
                  selectedUserForQR.foto
                    ? {
                        src: `/img/users/${selectedUserForQR.foto}`,
                        x: undefined,
                        y: undefined,
                        height: 44,
                        width: 44,
                        excavate: true
                      }
                    : undefined
                }
              />
            ) : (
              <div className='flex flex-col items-center gap-3 py-6'>
                <div className='w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300'>
                  <UserPlus className='h-8 w-8 text-slate-400' />
                </div>
                <div className='text-center'>
                  <p className='text-slate-900 font-black uppercase tracking-tight text-sm'>
                    Sin Token Asignado
                  </p>
                  <p className='text-slate-500 text-xs mt-1'>
                    Este usuario aún no tiene un código QR configurado.
                  </p>
                </div>
                <Button
                  onClick={() => handleGenerateQR(selectedUserForQR.id)}
                  disabled={isGeneratingToken}
                  className='bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-xl uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95'
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${isGeneratingToken ? 'animate-spin' : ''}`}
                  />
                  Generar QR
                </Button>
              </div>
            )}
          </div>

          {codigoAsistencia && (
            <div className='flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10'>
              <span className='text-slate-400 text-xs font-semibold'>Código:</span>
              <span className='text-indigo-400 text-2xl font-black tracking-[0.3em] font-mono'>
                {codigoAsistencia}
              </span>
            </div>
          )}

          <p className='text-center text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]'>
            El código se actualizará automáticamente tras el escaneo
          </p>
        </DialogContent>
      </Dialog>

      {/* Modal de registro manual de asistencia */}
      <AsistenciaForm
        isOpen={asistenciaFormOpen}
        onOpenChange={setAsistenciaFormOpen}
        onSuccess={fetchAsistencias}
      />
    </PermissionGuard>
  );
}

