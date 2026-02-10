// components/attendance/AttendanceTable.tsx
'use client';

import { useState } from 'react';
import { Table } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrencyNoDecimals } from '@/lib/formatters';
import useAsistencias from '@/hooks/personal/useAsistencias';
import { Badge } from '../ui/badge';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, User, Calendar, DollarSign, Coins, MinusCircle, Calculator } from 'lucide-react';
import { AsistenciaResumen } from '@/types/asistencia';
import { Button } from '@/components/ui/button';
import AttendanceDetailModal from './AttendanceDetailModal';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';

interface AttendanceData {
  id_usuario: number;
  nick: string;
  nombre_completo: string;
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
  const [selectedUser, setSelectedUser] = useState<{
    id: number;
    name: string;
    nick: string;
  } | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Verificar permiso para ver detalles
  const canViewDetail = hasPermission('asistencias', 'ver_detalles');

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

  // Vista de tarjetas para móviles
  const MobileCardView = () => (
    <div className='space-y-4 lg:hidden'>
      {data.map(item => (
        <Card key={item.id_usuario} className='shadow-sm hover:shadow-md transition-shadow'>
          <CardContent className='p-4'>
            <div className='space-y-3'>
              {/* Header con nombre y nick */}
              <div className='flex items-center justify-between'>
                <h3 className='font-semibold text-lg text-gray-900'>{item.nombre_completo}</h3>
                <Badge variant='outline' className='text-xs'>
                  {item.nick}
                </Badge>
              </div>

              {/* Información de asistencia */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm'>
                <div className='flex items-center gap-2'>
                  <Calendar className='text-gray-500 w-4' />
                  <span className='font-medium'>Asistencias:</span>
                  <Badge variant='success' className='bg-green-400 text-xs'>
                    {item.total_asistencias} Días
                  </Badge>
                </div>

                <div className='flex items-center gap-2'>
                  <DollarSign className='text-gray-500 w-4' />
                  <span className='font-medium'>Sueldo:</span>
                  <span className='text-gray-700 font-semibold'>
                    {formatCurrencyNoDecimals(item.sueldo_total)}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <Coins className='text-gray-500 w-4' />
                  <span className='font-medium'>Aporte AFP:</span>
                  <span className='text-gray-700'>
                    {formatCurrencyNoDecimals(item.aporte_total)}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <MinusCircle className='text-gray-500 w-4' />
                  <span className='font-medium'>Descuento Habitación:</span>
                  <span className='text-gray-700'>
                    {formatCurrencyNoDecimals(item.descuento_total)}
                  </span>
                </div>

                <div className='flex items-center gap-2 sm:col-span-2'>
                  <Calculator className='text-gray-500 w-4' />
                  <span className='font-medium'>Total a Pagar:</span>
                  <span className='text-gray-700 font-bold text-lg'>
                    {formatCurrencyNoDecimals(item.total_final)}
                  </span>
                </div>
              </div>

              {/* Acción */}
              {canViewDetail && (
                <div className='flex justify-center pt-2 border-t border-gray-100'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white text-xs'
                    onClick={() => handleViewDetail(item)}
                  >
                    <Eye className='w-3 h-3 mr-1' />
                    Ver Detalle
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Vista de tabla para pantallas grandes
  const DesktopTableView = () => (
    <div className='hidden lg:block'>
      <div className='w-full overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='text-start text-sm'>Nombre</TableHead>
              <TableHead className='text-center text-sm'>Nick</TableHead>
              <TableHead className='text-center text-sm'>Asistencias</TableHead>
              <TableHead className='text-center text-sm'>Sueldo</TableHead>
              <TableHead className='text-center text-sm'>
                Aporte <br /> AFP
              </TableHead>
              <TableHead className='text-center text-sm'>
                Descuento <br /> Habitación
              </TableHead>
              <TableHead className='text-center text-sm'>Total</TableHead>
              {canViewDetail && (
                <TableHead className='text-center text-sm'>Detalles</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(item => (
              <TableRow key={item.id_usuario}>
                <TableCell className='font-medium text-start text-sm'>
                  {item.nombre_completo}
                </TableCell>
                <TableCell className='text-sm text-center'>{item.nick}</TableCell>
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
                  <TableCell className='text-center hover:text-blue-700 cursor-pointer'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => handleViewDetail(item)}
                      className='h-8 w-8 p-0 hover:bg-blue-50'
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

  return (
    <>
      <MobileCardView />
      <DesktopTableView />

      {/* Modal de detalle */}
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
