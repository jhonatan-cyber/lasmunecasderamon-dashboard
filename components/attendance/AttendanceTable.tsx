'use client';

/* eslint-disable */

'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { useAsistencias } from '@/hooks/personal';
import { Badge } from '../ui/badge';
import { Eye, Calendar } from 'lucide-react';
import { AsistenciaResumen } from '@/types/asistencia';
import { Button } from '@/components/ui/button';
import AttendanceDetailModal from './AttendanceDetailModal';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { useUserImage } from '@/contexts/UserImageContext';

interface AttendanceData {
  id_usuario: number;
  nick: string;
  nombre_completo: string;
  usuario_foto: string;
  total_asistencias: number;
  sueldo_total: number;
  aporte_total: number;
  descuento_total: number;
  total_final: number;
}

interface AttendanceTableProps {
  data?: any[];
}

export default function AttendanceTable({ data }: AttendanceTableProps) {
  const { loading, error } = useAsistencias();
  const { hasPermission } = useUserPermissions();
  const { imageVersion } = useUserImage();
  const [selectedUser, setSelectedUser] = useState<{
    id: number;
    name: string;
    nick: string;
  } | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const canViewDetail = hasPermission('attendance', 'view_details');

  const handleViewDetail = (user: AttendanceData) => {
    setSelectedUser({
      id: user.id_usuario,
      name: user.nombre_completo,
      nick: user.nick
    });
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedUser(null);
  };

  if (loading) {
    return (
      <div className='space-y-4'>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className='h-12 w-full' />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className='rounded-md bg-red-50 p-4'>
        <p className='text-sm sm:text-base text-red-600'>{error}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className='text-center py-8'>
        <div className='flex flex-col items-center space-y-4'>
          <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center'>
            <Calendar className='w-8 h-8 text-gray-400' />
          </div>
          <div>
            <h3 className='text-lg font-medium text-gray-900 mb-2'>No hay asistencias</h3>
            <p className='text-sm text-gray-500'>
              No se encontraron registros de asistencia para mostrar
            </p>
          </div>
        </div>
      </div>
    );
  }

  const TableView = () => (
    <div className='hidden sm:block bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl border-none shadow-md overflow-hidden'>
      <div className='overflow-x-auto'>
        <Table className='min-w-full text-base text-center'>
          <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
            <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Empleado</TableHead>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Nick</TableHead>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Rol</TableHead>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                Asistencias
              </TableHead>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Sueldo</TableHead>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                Aporte AFP
              </TableHead>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Descuento</TableHead>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Total</TableHead>
              {canViewDetail && (
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                  Detalles
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, idx) => (
              <TableRow
                key={item.id_usuario}
                className={`border-b transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/30 border-gray-100 dark:border-gray-800 ${idx === 0 ? 'first:rounded-t-xl' : ''} ${idx === data.length - 1 ? 'last:rounded-b-xl' : ''}`}
              >
                <TableCell className='font-medium text-start text-sm'>
                  <div className='flex items-center gap-3'>
                    <Avatar className='h-8 w-8'>
                      {item.usuario_foto && item.usuario_foto !== '' ? (
                        <Image
                          src={`/img/users/${item.usuario_foto}?v=${imageVersion}`}
                          alt={item.nombre_completo}
                          width={32}
                          height={32}
                          className='w-full h-full object-cover rounded-full'
                        />
                      ) : (
                        <AvatarImage src='/img/users/default.png' alt={item.nombre_completo} />
                      )}
                      <AvatarFallback className='bg-purple-100 text-purple-700 font-bold text-xs'>
                        {item.nombre_completo?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className='font-bold text-sm text-gray-900 dark:text-white'>
                      {item.nombre_completo}
                    </span>
                  </div>
                </TableCell>
                <TableCell className='text-sm text-center'>{item.nick}</TableCell>
                <TableCell className='text-sm text-center'>
                  <Badge className='bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-full px-2 py-1 text-xs font-medium'>
                    {item.rol || 'Sin rol'}
                  </Badge>
                </TableCell>
                <TableCell className='text-center'>
                  <Badge variant='success' className='bg-green-400 text-xs'>
                    {item.total_asistencias} Días
                  </Badge>
                </TableCell>
                <TableCell className='text-center text-sm'>
                  {formatCurrencyNoDecimals(item.sueldo_total)}
                </TableCell>
                <TableCell className='text-center text-sm'>
                  {formatCurrencyNoDecimals(item.aporte_total)}
                </TableCell>
                <TableCell className='text-center text-sm'>
                  {formatCurrencyNoDecimals(item.descuento_total)}
                </TableCell>
                <TableCell className='text-center font-bold text-sm'>
                  {formatCurrencyNoDecimals(item.total_final)}
                </TableCell>
                {canViewDetail && (
                  <TableCell className='text-center'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => handleViewDetail(item)}
                      className='h-8 w-8 p-0 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors duration-200'
                    >
                      <Eye className='w-4 h-4' />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const MobileCardView = () => (
    <div className='sm:hidden space-y-3'>
      {data.map(item => (
        <div
          key={item.id_usuario}
          className='bg-white dark:bg-slate-900/40 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs'
        >
          <div className='flex items-start justify-between gap-2'>
            <div className='flex items-center gap-3 min-w-0'>
              <Avatar className='h-10 w-10'>
                {item.usuario_foto && item.usuario_foto !== '' ? (
                  <Image
                    src={`/img/users/${item.usuario_foto}?v=${imageVersion}`}
                    alt={item.nombre_completo}
                    width={40}
                    height={40}
                    className='w-full h-full object-cover rounded-full'
                  />
                ) : (
                  <AvatarImage src='/img/users/default.png' alt={item.nombre_completo} />
                )}
                <AvatarFallback className='bg-purple-100 text-purple-700 font-bold text-xs'>
                  {item.nombre_completo?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className='min-w-0'>
                <p className='font-bold text-sm text-gray-900 dark:text-white truncate'>
                  {item.nombre_completo}
                </p>
                <p className='text-xs text-gray-500 truncate'>@{item.nick}</p>
              </div>
            </div>
            {canViewDetail && (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => handleViewDetail(item)}
                className='h-8 w-8 p-0 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30'
              >
                <Eye className='w-4 h-4' />
              </Button>
            )}
          </div>

          <div className='grid grid-cols-2 gap-2 mt-3 text-xs'>
            <div>
              <span className='text-gray-500'>Rol</span>
              <div>
                <Badge className='bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-full px-2 py-1 text-xs font-medium mt-1'>
                  {item.rol || 'Sin rol'}
                </Badge>
              </div>
            </div>
            <div>
              <span className='text-gray-500'>Asistencias</span>
              <div>
                <Badge variant='success' className='bg-green-400 text-xs mt-1'>
                  {item.total_asistencias} Días
                </Badge>
              </div>
            </div>
            <div>
              <span className='text-gray-500'>Sueldo</span>
              <p className='font-semibold text-gray-900 dark:text-white'>
                {formatCurrencyNoDecimals(item.sueldo_total)}
              </p>
            </div>
            <div>
              <span className='text-gray-500'>Aporte AFP</span>
              <p className='font-semibold text-gray-900 dark:text-white'>
                {formatCurrencyNoDecimals(item.aporte_total)}
              </p>
            </div>
            <div>
              <span className='text-gray-500'>Descuento</span>
              <p className='font-semibold text-gray-900 dark:text-white'>
                {formatCurrencyNoDecimals(item.descuento_total)}
              </p>
            </div>
            <div>
              <span className='text-gray-500'>Total</span>
              <p className='font-bold text-gray-900 dark:text-white'>
                {formatCurrencyNoDecimals(item.total_final)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <MobileCardView />
      <TableView />

      {}
      {selectedUser && (
        <AttendanceDetailModal
          isOpen={isDetailModalOpen}
          onClose={handleCloseModal}
          userId={selectedUser.id}
          userName={selectedUser.name}
          userNick={selectedUser.nick}
        />
      )}
    </>
  );
}
