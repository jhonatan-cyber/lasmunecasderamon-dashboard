/* eslint-disable */
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CuentaWithDetails } from '@/types/cuenta';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import {
  Eye,
  CreditCard,
  MoreVertical,
  ShoppingCart,
  User,
  Bed,
  Calendar,
  DollarSign,
  Receipt
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import CuentaDetailModal from '../modals/CuentaDetailModal';
import AgregarProductosModal from '../modals/AgregarProductosModal';
import CobrarCuentaModal from '../modals/CobrarCuentaModal';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { formatShortDmyDateEs } from '@/lib/utils/calendarUtils';
import { useCuentaTableLogic } from '@/hooks/cuentas/useCuentaTableLogic';

interface CuentaTableProps {
  loading: boolean;
  rows: CuentaWithDetails[];
  rowsPerPage: number;
  onRefresh?: () => void;
  onOrderStatusChange?: () => void;
}

export default function CuentaTable({
  loading,
  rows,
  onRefresh,
  onOrderStatusChange
}: CuentaTableProps) {
  const { hasPermission } = useUserPermissions();
  const {
    selectedCuentaId,
    detailModalOpen,
    setDetailModalOpen,
    agregarProductosOpen,
    setAgregarProductosOpen,
    cobrarCuentaOpen,
    setCobrarCuentaOpen,
    cuentaSeleccionada,
    handleVerDetalles,
    handleAgregarProductos,
    handleCobrarCuenta,
    handleProductosAgregados: hookHandleProductosAgregados,
    handleCuentaCobrada: hookHandleCuentaCobrada,
    getEstadoBadge
  } = useCuentaTableLogic();

  // Verificar permisos
  const canViewDetails = hasPermission('cuentas', 'ver_detalles');
  const canAddProducts = hasPermission('cuentas', 'agregar_productos');
  const canCobrar = hasPermission('cuentas', 'cobrar');

  // Si no tiene ningún permiso de acción, no mostrar el menú
  const hasAnyAction = canViewDetails || canAddProducts || canCobrar;

  const selectedCuentaIdForAction = cuentaSeleccionada
    ? String(cuentaSeleccionada.id_cuenta ?? cuentaSeleccionada.id ?? '')
    : null;

  const handleProductosAgregados = () => {
    hookHandleProductosAgregados();
    // Actualizar los datos de la página
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleCuentaCobrada = () => {
    hookHandleCuentaCobrada();
    // Actualizar los datos de la página
    if (onRefresh) {
      onRefresh();
    }
  };

  if (loading) {
    return (
      <div className='bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border-none shadow-md overflow-hidden p-8'>
        <div className='animate-pulse space-y-4'>
          <div className='h-12 bg-gray-100 dark:bg-gray-800 rounded-xl' />
          <div className='h-12 bg-gray-100 dark:bg-gray-800 rounded-xl' />
          <div className='h-12 bg-gray-100 dark:bg-gray-800 rounded-xl' />
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className='bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border-none shadow-md overflow-hidden p-8'>
        <div className='text-center py-12'>
          <div className='w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4'>
            <Receipt className='w-8 h-8 text-gray-400' />
          </div>
          <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>No hay cuentas</h3>
          <p className='text-sm text-gray-500'>No se encontraron cuentas para mostrar</p>
        </div>
      </div>
    );
  }

  // Vista de tarjetas para móviles
  const MobileCardView = () => (
    <div className='space-y-4 lg:hidden'>
      {rows.map(cuenta => (
        <Card key={cuenta.id_cuenta} className='shadow-sm hover:shadow-md transition-shadow'>
          <CardContent className='p-4'>
            <div className='space-y-3'>
              {/* Header con código y estado */}
              <div className='flex items-center justify-between'>
                <h3 className='font-semibold text-lg text-gray-900'>{cuenta.codigo}</h3>
                <Badge variant={getEstadoBadge(cuenta.estado).variant}>
                  {getEstadoBadge(cuenta.estado).label}
                </Badge>
              </div>

              {/* Información de la cuenta */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm'>
                <div className='flex items-center gap-2'>
                  <User className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Cliente:</span>
                  <span className='text-gray-700'>
                    {cuenta.cliente_nombre || `Cliente ${cuenta.cliente_id}`}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <Bed className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Habitación:</span>
                  <span className='text-gray-700'>
                    {cuenta.habitacion_numero || cuenta.habitacion_id || 'N/A'}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <DollarSign className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Sub Total:</span>
                  <span className='text-gray-700 font-semibold'>
                    {formatCurrencyNoDecimals(cuenta.sub_total)}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <Receipt className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Comisión:</span>
                  <span className='text-gray-700'>
                    {formatCurrencyNoDecimals(cuenta.total_comision)}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <DollarSign className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Total:</span>
                  <span className='text-gray-700 font-semibold'>
                    {formatCurrencyNoDecimals(cuenta.total)}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <Calendar className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Fecha:</span>
                  <span className='text-gray-700'>{formatShortDmyDateEs(cuenta.fecha_crea)}</span>
                </div>
              </div>

              {/* Acciones */}
              {hasAnyAction && (
                <div className='flex items-center gap-2 pt-2 border-t border-gray-100'>
                  {canViewDetails && (
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleVerDetalles(cuenta)}
                      className='flex-1 rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white text-xs'
                    >
                      <Eye className='w-3 h-3 mr-1' />
                      Ver Detalles
                    </Button>
                  )}

                  {cuenta.estado === 1 && (
                    <>
                      {canAddProducts && (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleAgregarProductos(cuenta)}
                          className='flex-1 rounded-full hover:scale-105 transition-all duration-200 hover:bg-green-600 hover:text-white text-xs'
                        >
                          <ShoppingCart className='w-3 h-3 mr-1' />
                          Agregar
                        </Button>
                      )}

                      {canCobrar && (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleCobrarCuenta(cuenta)}
                          className='flex-1 rounded-full hover:scale-105 transition-all duration-200 hover:bg-red-600 hover:text-white text-xs'
                        >
                          <CreditCard className='w-3 h-3 mr-1' />
                          Cobrar
                        </Button>
                      )}
                    </>
                  )}
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
      <div className='bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border-none shadow-md overflow-hidden'>
        <div className='overflow-x-auto'>
          <Table className='min-w-full text-base text-center'>
            <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
              <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Código</TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Cliente</TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                  Habitación
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                  Sub Total
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                  Comisión
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Total</TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Estado</TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Fecha</TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((cuenta, idx) => (
                <TableRow
                  key={cuenta.id_cuenta}
                  className={`border-b transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/30 border-gray-100 dark:border-gray-800 ${idx === 0 ? 'first:rounded-t-xl' : ''} ${idx === rows.length - 1 ? 'last:rounded-b-xl' : ''}`}
                >
                  <TableCell className='font-medium text-sm'>{cuenta.codigo}</TableCell>
                  <TableCell className='text-sm'>
                    {cuenta.cliente_nombre || `Cliente ${cuenta.cliente_id}`}
                  </TableCell>
                  <TableCell className='text-sm'>
                    {cuenta.habitacion_numero || cuenta.habitacion_id || 'N/A'}
                  </TableCell>
                  <TableCell className='text-sm'>
                    {formatCurrencyNoDecimals(cuenta.sub_total)}
                  </TableCell>
                  <TableCell className='text-sm'>
                    {formatCurrencyNoDecimals(cuenta.total_comision)}
                  </TableCell>
                  <TableCell className='font-bold text-sm'>
                    {formatCurrencyNoDecimals(cuenta.total)}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const estadoBadge = getEstadoBadge(cuenta.estado);
                      return (
                        <Badge variant={estadoBadge.variant}>
                          {estadoBadge.label}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell className='text-sm text-gray-500'>
                    {formatShortDmyDateEs(cuenta.fecha_crea)}
                  </TableCell>
                  <TableCell>
                    {hasAnyAction && (
                      <div className='flex justify-center'>
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
                                className='cursor-pointer hover:text-blue-700 hover:bg-blue-50'
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
                                    className='cursor-pointer hover:text-green-700 hover:bg-green-50'
                                    onClick={() => handleAgregarProductos(cuenta)}
                                  >
                                    <ShoppingCart className='h-4 w-4' />
                                    Agregar productos
                                  </DropdownMenuItem>
                                )}
                                {canCobrar && (
                                  <DropdownMenuItem
                                    className='cursor-pointer hover:text-red-700 hover:bg-red-50'
                                    onClick={() => handleCobrarCuenta(cuenta)}
                                  >
                                    <CreditCard className='h-4 w-4' />
                                    Cobrar
                                  </DropdownMenuItem>
                                )}
                              </>
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

  return (
    <>
      <MobileCardView />
      <DesktopTableView />

      {/* Modal de detalles */}
      <CuentaDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        cuentaId={selectedCuentaId}
      />

      {/* Modal de Agregar Productos */}
      <AgregarProductosModal
        open={agregarProductosOpen}
        onOpenChange={setAgregarProductosOpen}
        cuentaId={selectedCuentaIdForAction}
        onProductosAgregados={handleProductosAgregados}
      />

      {/* Modal de Cobrar Cuenta */}
      <CobrarCuentaModal
        open={cobrarCuentaOpen}
        onClose={() => setCobrarCuentaOpen(false)}
        cuenta={cuentaSeleccionada}
        onCuentaCobrada={handleCuentaCobrada}
        onOrderStatusChange={onOrderStatusChange}
      />
    </>
  );
}
