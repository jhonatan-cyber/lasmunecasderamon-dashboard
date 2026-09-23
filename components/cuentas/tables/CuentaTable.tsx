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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Clock,
  DollarSign,
  Receipt,
  Ban,
  Loader2
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
import { useCountdown, useTimer } from '@/contexts/TimerContext';
import { useConfirmModal } from '@/hooks/shared';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { useCuentaAnulacion } from '@/hooks/cuentas/useCuentaAnulacion';

interface CuentaTableProps {
  loading: boolean;
  rows: CuentaWithDetails[];
  rowsPerPage: number;
  onRefresh?: () => void;
  onOrderStatusChange?: () => void;
}

interface CuentaTableViewsProps {
  rows: CuentaWithDetails[];
  getEstadoBadge: (estado: number | string) => {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'success' | 'outline';
  };
  hasAnyAction: boolean;
  canViewDetails: boolean;
  canAddProducts: boolean;
  canCobrar: boolean;
  handleVerDetalles: (cuenta: CuentaWithDetails) => void;
  handleFinalizarTemporizador: (cuenta: CuentaWithDetails) => void;
  handleAgregarProductos: (cuenta: CuentaWithDetails) => void;
  handleCobrarCuenta: (cuenta: CuentaWithDetails) => void;
  handleSolicitarAnulacion: (cuenta: CuentaWithDetails) => void;
  getTimerByServicioId: (sid: string) => any;
}

function CuentaTimerStatus({
  cuenta,
  compact = false
}: {
  cuenta: CuentaWithDetails;
  compact?: boolean;
}) {
  const { getTimerByServicioId, formatTime } = useTimer();
  const cuentaId = String(cuenta.id_cuenta ?? (cuenta as any).id ?? '');
  const timer = cuentaId ? getTimerByServicioId(cuentaId) : null;
  const remainingTime = useCountdown(timer);

  if (!timer || !timer.isActive) {
    return null;
  }

  return (
    <div
      className={
        compact
          ? 'inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
          : 'inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
      }
    >
      <Clock className='h-3.5 w-3.5' />
      <span className='font-mono'>{formatTime(remainingTime)}</span>
    </div>
  );
}

const MobileCardView = React.memo(function MobileCardView({
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
    <div className='space-y-4 lg:hidden'>
      {rows.map(cuenta => (
        <Card key={cuenta.id_cuenta} className='shadow-xs hover:shadow-md transition-shadow'>
          <CardContent className='p-4'>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <div className='space-y-2'>
                  <h3 className='font-semibold text-lg text-gray-900'>{cuenta.codigo}</h3>
                  <CuentaTimerStatus cuenta={cuenta} />
                </div>
                <Badge variant={getEstadoBadge(cuenta.estado).variant}>
                  {getEstadoBadge(cuenta.estado).label}
                </Badge>
              </div>

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

                {cuenta.estado === 4 && (
                  <div className='flex items-center gap-2 sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/20'>
                    <DollarSign className='text-amber-600 w-4 h-4' />
                    <span className='font-medium text-amber-700 dark:text-amber-300'>
                      Saldo restante:
                    </span>
                    <span className='font-semibold text-amber-700 dark:text-amber-300'>
                      {formatCurrencyNoDecimals(cuenta.total)}
                    </span>
                  </div>
                )}

                <div className='flex items-center gap-2'>
                  <Calendar className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Fecha:</span>
                  <span className='text-gray-700'>{formatShortDmyDateEs(cuenta.fecha_crea)}</span>
                </div>
              </div>

              {hasAnyAction && (
                <div className='flex items-center gap-2 pt-2 border-t border-gray-100'>
                  {canViewDetails && (
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleVerDetalles(cuenta)}
                      className='flex-1 rounded-full bg-blue-50 border-blue-200 hover:bg-blue-700 hover:text-white text-xs'
                    >
                      <Eye className='w-3 h-3 mr-1' />
                      Ver Detalles
                    </Button>
                  )}

                  {cuenta.estado === 1 && (
                    <>
                      {getTimerByServicioId(String(cuenta.id_cuenta))?.isActive && (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleFinalizarTemporizador(cuenta)}
                          className='flex-1 rounded-full bg-amber-50 border-amber-200 hover:bg-amber-700 hover:text-white text-xs'
                        >
                          <Clock className='w-3 h-3 mr-1' />
                          Finalizar Timer
                        </Button>
                      )}

                      {canAddProducts && (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleAgregarProductos(cuenta)}
                          className='flex-1 rounded-full bg-green-50 border-green-200 hover:bg-green-700 hover:text-white text-xs'
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
                          className='flex-1 rounded-full bg-red-50 border-red-200 hover:bg-red-700 hover:text-white text-xs'
                        >
                          <CreditCard className='w-3 h-3 mr-1' />
                          Cobrar
                        </Button>
                      )}

                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleSolicitarAnulacion(cuenta)}
                        className='flex-1 rounded-full bg-orange-50 border-orange-200 hover:bg-orange-700 hover:text-white text-xs'
                      >
                        <Ban className='w-3 h-3 mr-1' />
                        Anular
                      </Button>
                    </>
                  )}

                  {cuenta.estado === 4 && canCobrar && (
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleCobrarCuenta(cuenta)}
                      className='flex-1 rounded-full bg-red-50 border-red-200 hover:bg-red-700 hover:text-white text-xs'
                    >
                      <CreditCard className='w-3 h-3 mr-1' />
                      Cobrar saldo
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

const DesktopTableView = React.memo(function DesktopTableView({
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
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Tiempo</TableHead>
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
                  <TableCell className='font-medium text-sm text-left'>{cuenta.codigo}</TableCell>
                  <TableCell className='text-sm text-left'>
                    {cuenta.cliente_nombre || `Cliente ${cuenta.cliente_id}`}
                  </TableCell>
                  <TableCell className='text-sm text-left'>
                    {cuenta.habitacion_numero || cuenta.habitacion_id || 'N/A'}
                  </TableCell>
                  <TableCell className='text-sm text-left'>
                    {formatCurrencyNoDecimals(cuenta.sub_total)}
                  </TableCell>
                  <TableCell className='text-sm text-left'>
                    {formatCurrencyNoDecimals(cuenta.total_comision)}
                  </TableCell>
                  <TableCell className='font-bold text-sm text-left'>
                    {formatCurrencyNoDecimals(cuenta.total)}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const estadoBadge = getEstadoBadge(cuenta.estado);
                      return <Badge variant={estadoBadge.variant}>{estadoBadge.label}</Badge>;
                    })()}
                  </TableCell>
                  <TableCell className='text-sm text-left'>
                    <CuentaTimerStatus cuenta={cuenta} compact />
                  </TableCell>
                  <TableCell className='text-sm text-gray-500 text-left'>
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

export default function CuentaTable({
  loading,
  rows,
  onRefresh,
  onOrderStatusChange
}: CuentaTableProps) {
  const { hasPermission } = useUserPermissions();
  const { getTimerByServicioId } = useTimer();
  const { modalState, showConfirm, closeModal } = useConfirmModal();
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

  const {
    anulacionDialogOpen,
    setAnulacionDialogOpen,
    cuentaParaAnular,
    motivoAnulacion,
    setMotivoAnulacion,
    montoAnulacion,
    setMontoAnulacion,
    anulandoCuenta,
    handleSolicitarAnulacion,
    handleConfirmarSolicitudAnulacion,
    closeAnulacionDialog,
    handleFinalizarTemporizador,
    formatMontoInput
  } = useCuentaAnulacion({ onRefresh, onOrderStatusChange, showConfirm });

  const canViewDetails = hasPermission('cuentas', 'ver_detalles');
  const canAddProducts = hasPermission('cuentas', 'agregar_productos');
  const canCobrar = hasPermission('cuentas', 'cobrar');

  const hasAnyAction = canViewDetails || canAddProducts || canCobrar;

  const selectedCuentaIdForAction = cuentaSeleccionada
    ? String(cuentaSeleccionada.id_cuenta ?? cuentaSeleccionada.id ?? '')
    : null;

  const handleProductosAgregados = () => {
    hookHandleProductosAgregados();
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleCuentaCobrada = () => {
    hookHandleCuentaCobrada();
    if (onRefresh) {
      onRefresh();
    }
  };

  if (loading) {
    return (
      <div className='bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl border-none shadow-md overflow-hidden p-8'>
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
      <div className='bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl border-none shadow-md overflow-hidden p-8'>
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

  const viewProps: CuentaTableViewsProps = {
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
  };

  return (
    <>
      <MobileCardView {...viewProps} />
      <DesktopTableView {...viewProps} />

      <CuentaDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        cuentaId={selectedCuentaId}
      />

      <AgregarProductosModal
        open={agregarProductosOpen}
        onOpenChange={setAgregarProductosOpen}
        cuentaId={selectedCuentaIdForAction}
        onProductosAgregados={handleProductosAgregados}
      />

      <CobrarCuentaModal
        open={cobrarCuentaOpen}
        onClose={() => setCobrarCuentaOpen(false)}
        cuenta={cuentaSeleccionada}
        onCuentaCobrada={handleCuentaCobrada}
        onOrderStatusChange={onOrderStatusChange}
      />

      <ConfirmModal
        open={modalState.open}
        onOpenChange={closeModal}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        type={modalState.type as 'question' | 'warning' | 'info' | 'success'}
        onConfirm={modalState.onConfirm || (() => {})}
      />

      <Dialog
        open={anulacionDialogOpen}
        onOpenChange={open => {
          if (anulandoCuenta) return;
          setAnulacionDialogOpen(open);
          if (!open) {
            closeAnulacionDialog();
          }
        }}
      >
        <DialogContent className='max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl'>
          <DialogHeader className='p-6 pb-2 border-b'>
            <DialogTitle className='text-xl font-bold'>Solicitar anulacion</DialogTitle>
            <DialogDescription>
              Completa el motivo y el monto antes de enviar la solicitud por WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className='flex-1 overflow-y-auto p-6 space-y-6'>
            <div className='rounded-2xl border bg-slate-50 p-4 dark:bg-slate-900/60'>
              <div className='text-sm text-slate-500 dark:text-slate-400'>Cuenta</div>
              <div className='font-semibold text-slate-900 dark:text-slate-100'>
                {cuentaParaAnular?.codigo || '-'}
              </div>
              <div className='mt-3 text-sm text-slate-500 dark:text-slate-400'>Cliente</div>
              <div className='font-semibold text-slate-900 dark:text-slate-100'>
                {cuentaParaAnular?.cliente_nombre || 'Sin registrar'}
              </div>
              <div className='mt-3 text-sm text-slate-500 dark:text-slate-400'>Monto total</div>
              <div className='text-lg font-black text-amber-600 dark:text-amber-400'>
                {formatCurrencyNoDecimals(Number(cuentaParaAnular?.total || 0))}
              </div>
            </div>

            <div>
              <Label htmlFor='monto-anulacion-cuenta' className='mb-2 text-sm sm:text-base'>
                Monto a solicitar
              </Label>
              <span className='text-xs text-red-500'> *</span>
              <Input
                id='monto-anulacion-cuenta'
                type='text'
                inputMode='numeric'
                value={montoAnulacion}
                onChange={event => setMontoAnulacion(formatMontoInput(event.target.value))}
                placeholder='Ingresa el monto'
              />
              <p className='text-xs text-slate-500 dark:text-slate-400 mt-1'>
                Total de referencia:{' '}
                {formatCurrencyNoDecimals(Number(cuentaParaAnular?.total || 0))}
              </p>
            </div>

            <div>
              <Label htmlFor='motivo-anulacion-cuenta' className='mb-2 text-sm sm:text-base'>
                Motivo
              </Label>
              <span className='text-xs text-red-500'> *</span>
              <Textarea
                id='motivo-anulacion-cuenta'
                value={motivoAnulacion}
                onChange={event => setMotivoAnulacion(event.target.value)}
                placeholder='Escribe el motivo de la anulacion'
                rows={5}
                className='mt-2'
              />
            </div>
          </div>

          <div className='border-t p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center gap-3 px-6 rounded-b-2xl'>
            <Button
              variant='outline'
              onClick={closeAnulacionDialog}
              className='rounded-full px-6 dark:hover:bg-white dark:hover:text-black transition-all hover:scale-105'
              disabled={anulandoCuenta}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarSolicitudAnulacion}
              className='bg-black text-white dark:bg-black dark:text-white dark:hover:bg-white! dark:hover:text-black! rounded-full px-8 hover:bg-white! hover:text-black! transition-all hover:scale-105 border-2'
              disabled={anulandoCuenta}
            >
              {anulandoCuenta ? (
                <div className='flex items-center gap-2'>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  <span>Enviando...</span>
                </div>
              ) : (
                <span>Enviar solicitud</span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
