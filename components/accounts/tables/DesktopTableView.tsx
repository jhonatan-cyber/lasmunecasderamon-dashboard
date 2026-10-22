'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Eye, CreditCard, MoreVertical, ShoppingCart, Clock, Ban } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { formatShortDmyDateEs } from '@/lib/utils/calendarUtils';
import { CuentaTimerStatus } from './CuentaTimerStatus';
import type { CuentaTableViewsProps } from './CuentaTableViewsProps';

export const DesktopTableView = React.memo(function DesktopTableView({
  rows,
  getEstadoBadge,
  hasAnyAction,
  canViewDetails,
  canAddProducts,
  canCobrar,
  handleVerDetalles,
  handleFinalizarTemporizador,
  handleAgregarProductos,
  handleCobrarCuenta,
  handleSolicitarAnulacion,
  getTimerByServicioId
}: CuentaTableViewsProps) {
  return (
    <div className='hidden lg:block'>
      <div className='bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl border-none shadow-md overflow-hidden'>
        <div className='overflow-x-auto'>
          <Table className='min-w-full text-center'>
            <TableHeader>
              <TableRow className='hover:bg-transparent'>
                <TableHead>Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Habitación</TableHead>
                <TableHead>Sub Total</TableHead>
                <TableHead>Comisión</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Tiempo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((cuenta, idx) => (
                <TableRow
                  key={cuenta.id_cuenta}
                  className={`border-b transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/30 border-gray-100 dark:border-gray-800 ${idx === 0 ? 'first:rounded-t-xl' : ''} ${idx === rows.length - 1 ? 'last:rounded-b-xl' : ''}`}
                >
                  <TableCell className='font-medium text-left'>{cuenta.codigo}</TableCell>
                  <TableCell className='text-left'>
                    {cuenta.cliente_nombre || `Cliente ${cuenta.cliente_id}`}
                  </TableCell>
                  <TableCell className='text-left'>
                    {cuenta.habitacion_numero || cuenta.habitacion_id || 'N/A'}
                  </TableCell>
                  <TableCell className='text-left'>
                    {formatCurrencyNoDecimals(cuenta.sub_total)}
                  </TableCell>
                  <TableCell className='text-left'>
                    {formatCurrencyNoDecimals(cuenta.total_comision)}
                  </TableCell>
                  <TableCell className='font-bold text-left'>
                    {formatCurrencyNoDecimals(cuenta.total)}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const estadoBadge = getEstadoBadge(cuenta.estado);
                      return <Badge variant={estadoBadge.variant}>{estadoBadge.label}</Badge>;
                    })()}
                  </TableCell>
                  <TableCell className='text-left'>
                    <CuentaTimerStatus cuenta={cuenta} compact />
                  </TableCell>
                  <TableCell className='text-left'>
                    {formatShortDmyDateEs(cuenta.fecha_crea)}
                  </TableCell>
                  <TableCell>
                    {hasAnyAction && (
                      <div className='flex justify-start'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='bg-white hover:bg-gray-50 rounded-full'
                            >
                              <MoreVertical className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end' className='w-44'>
                            {canViewDetails && (
                              <DropdownMenuItem
                                className='cursor-pointer text-blue-700 hover:text-white hover:bg-blue-700'
                                onClick={() => handleVerDetalles(cuenta)}
                              >
                                <Eye className='h-4 w-4' />
                                Ver detalles
                              </DropdownMenuItem>
                            )}
                            {cuenta.estado === 1 && (
                              <>
                                {canAddProducts && (
                                  <DropdownMenuItem
                                    className='cursor-pointer text-green-700 hover:text-white hover:bg-green-700'
                                    onClick={() => handleAgregarProductos(cuenta)}
                                  >
                                    <ShoppingCart className='h-4 w-4' />
                                    Agregar productos
                                  </DropdownMenuItem>
                                )}
                                {getTimerByServicioId(String(cuenta.id_cuenta))?.isActive && (
                                  <DropdownMenuItem
                                    className='cursor-pointer text-amber-700 hover:text-white hover:bg-amber-700'
                                    onClick={() => handleFinalizarTemporizador(cuenta)}
                                  >
                                    <Clock className='h-4 w-4' />
                                    Finalizar timer
                                  </DropdownMenuItem>
                                )}
                                {canCobrar && (
                                  <DropdownMenuItem
                                    className='cursor-pointer text-red-700 hover:text-white hover:bg-red-700'
                                    onClick={() => handleCobrarCuenta(cuenta)}
                                  >
                                    <CreditCard className='h-4 w-4' />
                                    Cobrar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className='cursor-pointer text-orange-700 hover:text-white hover:bg-orange-700'
                                  onClick={() => handleSolicitarAnulacion(cuenta)}
                                >
                                  <Ban className='h-4 w-4' />
                                  Solicitar anulacion
                                </DropdownMenuItem>
                              </>
                            )}
                            {cuenta.estado === 4 && canCobrar && (
                              <DropdownMenuItem
                                className='cursor-pointer text-red-700 hover:text-white hover:bg-red-700'
                                onClick={() => handleCobrarCuenta(cuenta)}
                              >
                                <CreditCard className='h-4 w-4' />
                                Cobrar saldo
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
});
