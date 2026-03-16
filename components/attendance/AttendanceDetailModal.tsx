'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
import { Calendar, Clock, User, X, Info } from 'lucide-react';
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
  descuento?: number;
  semanas_con_descuento?: number;
  sueldo_final?: number;
  descuento_total?: number;
  total_final?: number;
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
    return timeString.slice(0, 5) + ' UTC';
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

  // Calcular totales
  const totalSueldos = asistencias.reduce((sum, a) => sum + (a.sueldo || 0), 0);
  const totalAportes = asistencias.reduce((sum, a) => sum + (a.aporte || 0), 0);
  const totalDescuentos = asistencias.reduce((sum, a) => sum + (a.descuento_total || 0), 0);
  const totalFinal = asistencias.reduce((sum, a) => sum + (a.total_final || 0), 0);

  // Obtener información del descuento (tomar del primer registro ya que es la misma para todos)
  const primerRegistro = asistencias[0];
  const semanasConDescuento = primerRegistro?.semanas_con_descuento || 0;
  const montoDescuento = primerRegistro?.descuento || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-4xl max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <div className='flex items-center justify-between'>
            <DialogTitle className='text-xl font-bold'>Detalle de Asistencias</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">

        <div className='space-y-4'>
          {/* Información del usuario con resumen */}
          <Card>
            <CardContent className='p-6'>
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                {/* Sección Izquierda: Información del Usuario */}
                <div className='flex flex-col space-y-2'>
                  <h4 className='text-sm font-medium text-gray-500 uppercase tracking-wide'>
                    Información del Usuario
                  </h4>
                  <div className='space-y-1'>
                    <div className='text-lg font-semibold text-gray-900'>{userName}</div>
                    <div className='text-sm text-gray-600'>@{userNick}</div>
                  </div>
                </div>

                {/* Sección Derecha: Totales Financieros */}
                <div className='flex flex-col space-y-2'>
                  <h4 className='text-sm font-medium text-gray-500 uppercase tracking-wide'>
                    Resumen Financiero
                  </h4>
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm text-gray-600'>Total sueldos:</span>
                      <span className='text-lg font-bold'>
                        {formatCurrencyNoDecimals(totalSueldos)}
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm text-gray-600'>Total aportes:</span>
                      <span className='text-lg font-bold '>
                        {formatCurrencyNoDecimals(totalAportes)}
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm text-gray-600'>Descuento habitación:</span>
                      <span className='text-lg font-bold '>
                        {formatCurrencyNoDecimals(totalDescuentos)}
                      </span>
                    </div>
                    <div className='flex items-center justify-between border-t pt-2'>
                      <span className='text-sm font-medium text-gray-700'>Total a pagar:</span>
                      <span className='text-lg font-bold text-green-600'>
                        {formatCurrencyNoDecimals(totalFinal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información adicional sobre el descuento */}
              {semanasConDescuento > 0 && (
                <div className='mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200'>
                  <div className='flex items-start gap-2'>
                    <Info className='w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0' />
                    <div className='text-sm text-blue-800'>
                      <p className='font-medium mb-1'>Información del Descuento por Habitación:</p>
                      <ul className='space-y-1 text-xs'>
                        <li>
                          • <strong>Semanas con descuento:</strong> {semanasConDescuento}
                        </li>
                        <li>
                          • <strong>Monto por semana:</strong>{' '}
                          {formatCurrencyNoDecimals(montoDescuento)}
                        </li>
                        <li>
                          • <strong>Total descuento:</strong>{' '}
                          {formatCurrencyNoDecimals(totalDescuentos)}
                        </li>
                        <li>
                          •{' '}
                          <em>
                            El descuento se aplica una vez por semana, no por cada día de asistencia
                          </em>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
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
                  onChange={value => {
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

                        <div className='grid grid-cols-2 gap-2 text-xs'>
                          <div>
                            <span className='text-gray-500'>Sueldo:</span>
                            <span className='font-medium ml-1'>
                              {formatCurrencyNoDecimals(asistencia.sueldo || 0)}
                            </span>
                          </div>
                          <div>
                            <span className='text-gray-500'>Aporte AFP:</span>
                            <span className='font-medium ml-1'>
                              {formatCurrencyNoDecimals(asistencia.aporte || 0)}
                            </span>
                          </div>
                        </div>
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
                          Sueldo
                        </TableHead>
                        <TableHead className='text-center py-2 px-3 text-sm font-medium text-gray-700'>
                          Aporte AFP
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
                          <TableCell className='py-3 px-3 text-sm text-center text-green-600 font-medium'>
                            {formatCurrencyNoDecimals(asistencia.sueldo || 0)}
                          </TableCell>
                          <TableCell className='py-3 px-3 text-sm text-center text-blue-600 font-medium'>
                            {formatCurrencyNoDecimals(asistencia.aporte || 0)}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
