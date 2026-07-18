'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, Clock } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import Paginate from '@/components/shared/Paginate';
import SelectElements from '@/components/shared/SelectElements';
import type { AsistenciaDetalle } from '@/hooks/attendance/useAttendanceDetail';

interface AttendanceTableSectionProps {
  asistencias: AsistenciaDetalle[];
  paginatedAsistencias: AsistenciaDetalle[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (value: number) => void;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
  renderStatusBadge: (estado: number) => React.ReactNode;
}

export function AttendanceTableSection({
  asistencias,
  paginatedAsistencias,
  loading,
  error,
  currentPage,
  totalPages,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  formatDate,
  formatTime,
  renderStatusBadge,
}: AttendanceTableSectionProps) {
  if (loading) {
    return (
      <div className='text-center py-8'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto' />
        <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>Cargando asistencias...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className='p-4'>
          <p className='text-red-600 text-sm'>{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (asistencias.length === 0) {
    return (
      <Card>
        <CardContent className='p-4 text-center'>
          <p className='text-gray-500 dark:text-gray-400 text-sm'>
            No hay asistencias registradas para este usuario
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <h3 className='font-semibold text-lg dark:text-white'>Registro de Asistencias</h3>
        <SelectElements
          value={pageSize}
          onChange={onPageSizeChange}
          options={pageSizeOptions}
          label='listar'
        />
      </div>

      {/* Mobile cards */}
      <div className='lg:hidden space-y-3'>
        {paginatedAsistencias.map((asistencia) => (
          <Card key={asistencia.id_asistencia} className='shadow-xs'>
            <CardContent className='p-4'>
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Calendar className='text-gray-500 dark:text-gray-400 w-4' />
                    <span className='font-medium text-sm dark:text-gray-200'>
                      {formatDate(asistencia.fecha)}
                    </span>
                  </div>
                  {renderStatusBadge(asistencia.estado)}
                </div>

                <div className='flex items-center gap-2'>
                  <Clock className='text-gray-500 dark:text-gray-400 w-4' />
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    Hora: {formatTime(asistencia.hora)}
                  </span>
                </div>

                <div className='grid grid-cols-2 gap-2 text-xs'>
                  <div>
                    <span className='text-gray-500 dark:text-gray-400'>Sueldo:</span>
                    <span className='font-medium ml-1 dark:text-gray-200'>
                      {formatCurrencyNoDecimals(asistencia.sueldo || 0)}
                    </span>
                  </div>
                  <div>
                    <span className='text-gray-500 dark:text-gray-400'>Aporte AFP:</span>
                    <span className='font-medium ml-1 dark:text-gray-200'>
                      {formatCurrencyNoDecimals(asistencia.aporte || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {totalPages > 1 && (
          <div className='flex justify-center mt-4'>
            <Paginate page={currentPage} totalPages={totalPages} setPage={onPageChange} />
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className='hidden lg:block'>
        <div className='bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl border-none shadow-md overflow-hidden'>
          <div className='overflow-x-auto'>
            <Table className='min-w-full text-base text-center'>
              <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
                <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-start'>Fecha</TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-start'>Hora</TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Sueldo</TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Aporte AFP</TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAsistencias.map((asistencia, idx) => (
                  <TableRow
                    key={asistencia.id_asistencia}
                    className={`border-b transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/30 ${
                      idx === 0 ? 'first:rounded-t-xl' : ''
                    } ${idx === paginatedAsistencias.length - 1 ? 'last:rounded-b-xl' : ''}`}
                  >
                    <TableCell className='py-3 px-5 text-sm dark:text-gray-200 text-start'>
                      {formatDate(asistencia.fecha)}
                    </TableCell>
                    <TableCell className='py-3 px-5 text-sm dark:text-gray-200 text-start'>
                      {formatTime(asistencia.hora)}
                    </TableCell>
                    <TableCell className='py-3 px-5 text-sm text-center text-green-600 dark:text-green-400 font-medium'>
                      {formatCurrencyNoDecimals(asistencia.sueldo || 0)}
                    </TableCell>
                    <TableCell className='py-3 px-5 text-sm text-center text-blue-600 dark:text-blue-400 font-medium'>
                      {formatCurrencyNoDecimals(asistencia.aporte || 0)}
                    </TableCell>
                    <TableCell className='py-3 px-5 text-center'>
                      {renderStatusBadge(asistencia.estado)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className='flex justify-center mt-4'>
            <Paginate page={currentPage} totalPages={totalPages} setPage={onPageChange} />
          </div>
        )}
      </div>
    </div>
  );
}

export function AttendanceDetailFooter({ onClose }: { onClose: () => void }) {
  return (
    <div className='shrink-0 px-6 py-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-slate-900/40'>
      <div className='flex justify-center'>
        <button
          onClick={onClose}
          className='rounded-full px-6 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium 
            text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent
            hover:bg-gray-100 dark:hover:bg-white dark:hover:text-black 
            transition-all hover:scale-105'
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
