'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Calendar, Clock, User, X } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/formatters';
import Paginate from '@/components/ui/paginate';
import SelectElements from '@/components/ui/select-elements';

interface AsistenciaDetalle {
  id_asistencia: number;
  fecha: string;
  hora: string;
  estado: number;
  observaciones?: string;
  sueldo?: number;
  aporte?: number;
  sueldo_final?: number;
}

interface AttendanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
  userNick: string;
}

export default function AttendanceDetailModal({
  isOpen,
  onClose,
  userId,
  userName,
  userNick
}: AttendanceDetailModalProps) {
  const [asistencias, setAsistencias] = useState<AsistenciaDetalle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const pageSizeOptions = [5, 10, 20, 40];

  useEffect(() => {
    if (isOpen && userId) {
      fetchAsistenciasDetalle();
    }
  }, [isOpen, userId]);

  const fetchAsistenciasDetalle = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/asistencias/${userId}/detalle`);

      if (!response.ok) {
        throw new Error('Error al obtener el detalle de asistencias');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al obtener el detalle');
      }

      setAsistencias(result.data || []);
    } catch (err) {
      console.error('Error al obtener detalle de asistencias:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setAsistencias([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5);
  };

  const getStatusBadge = (estado: number) => {
    switch (estado) {
      case 1:
        return <Badge className='bg-yellow-100 text-yellow-800'>Por Pagar</Badge>;
      case 0:
        return <Badge className='bg-green-100 text-green-800'>Pagado</Badge>;
      default:
        return <Badge className='bg-gray-100 text-gray-800'>Sin definir</Badge>;
    }
  };

  // Lógica de paginación
  const totalPages = Math.ceil(asistencias.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAsistencias = asistencias.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <div className='flex items-center justify-between'>
            <DialogTitle className='text-xl font-bold'>Detalle de Asistencias</DialogTitle>
          </div>
        </DialogHeader>

        <div className='space-y-4'>
                     {/* Información del usuario con resumen */}
                       <Card>
              <CardContent className='p-6'>
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                  {/* Sección Izquierda: Información del Usuario */}
                  <div className='flex flex-col space-y-2'>
                    <h4 className='text-sm font-medium text-gray-500 uppercase tracking-wide'>Información del Usuario</h4>
                    <div className='space-y-1'>
                      <div className='text-lg font-semibold text-gray-900'>{userName}</div>
                      <div className='text-sm text-gray-600'>@{userNick}</div>
                    </div>
                  </div>

                  {/* Sección Derecha: Totales Financieros */}
                  <div className='flex flex-col space-y-2'>
                    <h4 className='text-sm font-medium text-gray-500 uppercase tracking-wide'>Resumen Financiero</h4>
                    <div className='space-y-3'>
                      <div className='flex  items-center'>
                        <span className='text-sm text-gray-600'>Total sueldos :</span>
                        <span className='text-lg font-bold text-green-600 ml-5'>
                          {formatCurrencyNoDecimals(
                            asistencias.reduce((sum, a) => sum + (a.sueldo || 0), 0)
                          )}
                        </span>
                      </div>
                      <div className='flex  items-center'>
                        <span className='text-sm text-gray-600'>Total aportes :</span>
                        <span className='text-lg font-bold text-blue-600 ml-5'>
                          {formatCurrencyNoDecimals(
                            asistencias.reduce((sum, a) => sum + (a.aporte || 0), 0)
                          )}
                        </span>
                      </div>
                      <div className='flex items-center'>
                        <span className='text-sm text-gray-600'>Total a pagar :</span>
                        <span className='text-lg font-bold text-purple-600 ml-5'>
                          {formatCurrencyNoDecimals(
                            asistencias.reduce((sum, a) => sum + (a.sueldo_final || 0), 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          {/* Lista de asistencias */}
          {loading ? (
            <div className='text-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto'></div>
              <p className='mt-2 text-sm text-gray-600'>Cargando asistencias...</p>
            </div>
          ) : error ? (
            <Card>
              <CardContent className='p-4'>
                <p className='text-red-600 text-sm'>{error}</p>
              </CardContent>
            </Card>
          ) : asistencias.length === 0 ? (
            <Card>
              <CardContent className='p-4 text-center'>
                <p className='text-gray-500 text-sm'>
                  No hay asistencias registradas para este usuario
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <h3 className='font-semibold text-lg'>Registro de Asistencias</h3>
                
                {/* Controles de paginación para la tabla */}
                <SelectElements
                  value={pageSize}
                  onChange={(value) => {
                    setPageSize(value);
                    setCurrentPage(1);
                  }}
                  options={pageSizeOptions}
                  label='Asistencias por página'
                />
              </div>

                             {/* Vista móvil */}
               <div className='lg:hidden space-y-3'>
                 {paginatedAsistencias.map(asistencia => (
                   <Card key={asistencia.id_asistencia} className='shadow-sm'>
                     <CardContent className='p-4'>
                       <div className='space-y-2'>
                         <div className='flex items-center justify-between'>
                           <div className='flex items-center gap-2'>
                             <Calendar className='text-gray-500 w-4' />
                             <span className='font-medium text-sm'>
                               {formatDate(asistencia.fecha)}
                             </span>
                           </div>
                           {getStatusBadge(asistencia.estado)}
                         </div>

                         <div className='flex items-center gap-2'>
                           <Clock className='text-gray-500 w-4' />
                           <span className='text-sm text-gray-600'>
                             Hora: {formatTime(asistencia.hora)}
                           </span>
                         </div>

                         {asistencia.observaciones && (
                           <div className='text-sm text-gray-600 bg-gray-50 p-2 rounded'>
                             <span className='font-medium'>Observación:</span>{' '}
                             {asistencia.observaciones}
                           </div>
                         )}
                       </div>
                     </CardContent>
                   </Card>
                 ))}

                 {/* Paginación para móvil */}
                 {totalPages > 1 && (
                   <div className='flex justify-center mt-4'>
                     <Paginate
                       page={currentPage}
                       totalPages={totalPages}
                       setPage={handlePageChange}
                     />
                   </div>
                 )}
               </div>

              {/* Vista desktop */}
              <div className='hidden lg:block'>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='text-left py-2 px-3 text-sm font-medium text-gray-700'>
                          Fecha
                        </TableHead>
                        <TableHead className='text-left py-2 px-3 text-sm font-medium text-gray-700'>
                          Hora
                        </TableHead>
                        <TableHead className='text-center py-2 px-3 text-sm font-medium text-gray-700'>
                          Estado
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAsistencias.map(asistencia => (
                        <TableRow
                          key={asistencia.id_asistencia}
                          className='border-b border-gray-100 hover:bg-gray-50'
                        >
                          <TableCell className='py-3 px-3 text-sm'>
                            {formatDate(asistencia.fecha)}
                          </TableCell>
                          <TableCell className='py-3 px-3 text-sm'>
                            {formatTime(asistencia.hora)}
                          </TableCell>
                          <TableCell className='py-3 px-3 text-center'>
                            {getStatusBadge(asistencia.estado)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginación debajo de la tabla */}
                {totalPages > 1 && (
                  <div className='flex justify-center mt-4'>
                    <Paginate
                      page={currentPage}
                      totalPages={totalPages}
                      setPage={handlePageChange}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
