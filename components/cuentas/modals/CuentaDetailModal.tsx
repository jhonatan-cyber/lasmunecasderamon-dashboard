'use client';

import { useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  formatCurrencyNoDecimals,
  formatFechaConHora,
  formatSoloHora
} from '@/lib/utils/formatters';
import { formatLongDateEs } from '@/lib/utils/calendarUtils';
import { useCuentaDetail } from '@/hooks/cuentas';
import { summarizeCuentaDetalles } from '@/lib/utils/cuentas';
import { ProductCartTable } from '../tables/ProductCartTable';
import type { CuentaAnulacionItem, CuentaRoomHistoryItem } from '@/types/cuenta';

interface CuentaDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cuentaId: string | number | null;
}

interface CuentaUsuario {
  id_cuenta_usuario: number;
  cuenta_id: number;
  usuario_id: number;
  usuario_nombre?: string;
}

const formatMinutesLabel = (value?: number) => `${Number(value || 0)} min`;

const getClosedReasonLabel = (reason?: CuentaRoomHistoryItem['closedReason']) => {
  switch (reason) {
    case 'expired':
      return 'Tiempo agotado';
    case 'manual':
      return 'Finalizado manualmente';
    case 'charged':
      return 'Cobrada';
    case 'cancelled':
      return 'Solicitud de anulación';
    case 'changed_room':
      return 'Cambio de habitación';
    default:
      return null;
  }
};
const getAnulacionBadgeClass = (estado?: string) => {
  switch (String(estado || '').toLowerCase()) {
    case 'aprobado':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'rechazado':
      return 'bg-rose-100 text-rose-700 border-rose-200';
    default:
      return 'bg-amber-100 text-amber-700 border-amber-200';
  }
};

export default function CuentaDetailModal({
  open,
  onOpenChange,
  cuentaId
}: CuentaDetailModalProps) {
  const { cuenta, loading, hasFetched, handleClose, getEstadoBadge } = useCuentaDetail(
    cuentaId ? String(cuentaId) : null,
    open
  );

  const detalleResumen = useMemo(
    () => summarizeCuentaDetalles(cuenta?.detalles ?? []),
    [cuenta?.detalles]
  );
  const estadoBadge = cuenta ? getEstadoBadge(cuenta.estado) : null;
  const showLoading = loading || (open && !hasFetched);
  const resumenFinanciero = cuenta?.resumen_financiero;
  const historialHabitaciones = (cuenta?.habitaciones_historial_data ??
    []) as CuentaRoomHistoryItem[];
  const solicitudesAnulacion = (cuenta?.solicitudes_anulacion ?? []) as CuentaAnulacionItem[];

  const productosTabla = useMemo(
    () =>
      detalleResumen.groupedDetalles.map((detalle, index) => {
        
        const hostessIds = detalle.hostess_id
          ? String(detalle.hostess_id)
              .split(',')
              .map((id: string) => id.trim())
          : [];
        return {
          id_producto: detalle.id_producto ?? detalle.producto_id ?? detalle.agrupacionKey ?? index,
          nombre:
            detalle.producto ||
            detalle.nombre ||
            `Producto ID: ${detalle.id_producto ?? detalle.producto_id ?? '-'}`,
          precio: detalle.precio || 0,
          cantidad: detalle.cantidad || 0,
          sub_total: detalle.sub_total || 0,
          categoria_nombre: detalle.categoria || detalle.categoria_nombre || '',
          comision: detalle.comision || 0,
          selectedHostesses: hostessIds
        };
      }),
    [detalleResumen.groupedDetalles]
  );

  
  const usuariosCuenta = cuenta?.usuarios ?? [];
  const comisionPorAnfitriona =
    usuariosCuenta.length > 0 && detalleResumen.totalComision > 0
      ? usuariosCuenta.map((usuario: any) => {
          const usuarioId = String(usuario.usuario_id || usuario.id_usuario || usuario.id || '');
          const comisionTotal = detalleResumen.groupedDetalles.reduce((sum, item) => {
            const hostessIds = item.hostess_id
              ? String(item.hostess_id)
                  .split(',')
                  .map((id: string) => id.trim())
                  .filter(Boolean)
              : [];
            if (hostessIds.length > 0 && hostessIds.includes(usuarioId)) {
              const comisionPorAnfitriona = (item.comision || 0) / hostessIds.length;
              return sum + comisionPorAnfitriona;
            }
            return sum;
          }, 0);

          return {
            id: usuarioId,
            nombre: usuario.usuario_nombre || usuario.nick || usuario.nombre || 'Anfitriona',
            comision: comisionTotal
          };
        })
      : [];

  useEffect(() => {
    if (open && !cuentaId) {
      handleClose();
      onOpenChange(false);
    }
  }, [open, cuentaId, handleClose, onOpenChange]);

  const localHandleClose = () => {
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={localHandleClose}>
      <DialogContent className='sm:max-w-5xl max-h-[90vh] flex flex-col p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md'>
        <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800'>
          <div className='flex items-center justify-center'>
            <DialogTitle className='text-start text-xl font-semibold tracking-tight text-slate-900 dark:text-white'>
              Detalles de Cuenta
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4 bg-white dark:bg-slate-900'>
          {showLoading ? (
            <div className='flex items-center justify-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900' />
              <span className='ml-2 text-black'>Cargando detalles...</span>
            </div>
          ) : cuenta ? (
            <div className='space-y-8 rounded-xl'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-12 border-b pb-6 rounded-xl'>
                <div className='space-y-2 text-sm text-gray-700'>
                  <div>
                    <span className='font-medium'>
                      <b>Codigo:</b>
                    </span>{' '}
                    <span className='font-normal'>{cuenta.codigo}</span>
                  </div>
                  <div>
                    <span className='font-medium'>
                      <b>Cliente:</b>
                    </span>{' '}
                    <span className='font-normal'>{cuenta.cliente_nombre || 'Sin cliente'}</span>
                  </div>
                  <div>
                    <span className='font-medium'>
                      <b>Anfitrionas:</b>
                    </span>{' '}
                    <span className='font-normal'>
                      {cuenta.usuarios && cuenta.usuarios.length > 0
                        ? cuenta.usuarios.map((u: CuentaUsuario) => u.usuario_nombre).join(', ')
                        : 'Sin anfitrionas'}
                    </span>
                  </div>
                </div>

                <div className='space-y-2 text-sm text-gray-700'>
                  <div>
                    <span className='font-medium'>
                      <b>Fecha:</b>
                    </span>{' '}
                    <span className='font-normal'>{formatLongDateEs(cuenta.fecha_crea)}</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>
                      <b>Estado:</b>
                    </span>
                    {estadoBadge && (
                      <Badge variant={estadoBadge.variant}>{estadoBadge.label}</Badge>
                    )}
                  </div>
                  <div>
                    <span className='font-medium'>
                      <b>Habitación actual:</b>
                    </span>{' '}
                    <span className='font-normal'>
                      {cuenta.habitacion_numero || 'Sin habitación'}
                    </span>
                  </div>
                </div>
              </div>

              <div className='space-y-3'>
                <h3 className='text-sm font-semibold text-gray-700 dark:text-slate-200'>
                  Resumen financiero
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60'>
                    <p className='text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400'>
                      Total original
                    </p>
                    <p className='mt-2 text-xl font-bold text-slate-900 dark:text-slate-100'>
                      {formatCurrencyNoDecimals(resumenFinanciero?.total_original ?? cuenta.total)}
                    </p>
                  </div>

                  <div className='rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/40'>
                    <p className='text-xs uppercase tracking-wide text-rose-500 dark:text-rose-400'>
                      Total anulado aprobado
                    </p>
                    <p className='mt-2 text-xl font-bold text-rose-700 dark:text-rose-400'>
                      {formatCurrencyNoDecimals(resumenFinanciero?.total_anulado_aprobado ?? 0)}
                    </p>
                    {Number(resumenFinanciero?.total_anulacion_pendiente || 0) > 0 && (
                      <p className='mt-1 text-xs text-amber-700 dark:text-amber-400'>
                        Pendiente:{' '}
                        {formatCurrencyNoDecimals(
                          resumenFinanciero?.total_anulacion_pendiente ?? 0
                        )}
                      </p>
                    )}
                  </div>

                  <div className='rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/40'>
                    <p className='text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400'>
                      Total actual a cobrar
                    </p>
                    <p className='mt-2 text-xl font-bold text-emerald-700 dark:text-emerald-400'>
                      {formatCurrencyNoDecimals(resumenFinanciero?.total_actual ?? cuenta.total)}
                    </p>
                  </div>
                </div>
              </div>

              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-sm font-semibold text-gray-700'>Historial de habitación</h3>
                  <span className='text-xs text-gray-500'>
                    {historialHabitaciones.length} tramo
                    {historialHabitaciones.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {historialHabitaciones.length > 0 ? (
                  <div className='space-y-3'>
                    {historialHabitaciones.map((item, index) => (
                      <div
                        key={`${item.roomId}-${item.startedAt}-${index}`}
                        className='rounded-2xl border bg-white p-4 shadow-sm'
                      >
                        <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                          {getClosedReasonLabel(item.closedReason) && (
                            <p className='mt-1 text-xs text-sky-700'>
                              Cierre: {getClosedReasonLabel(item.closedReason)}
                            </p>
                          )}
                          <div>
                            <div className='flex items-center gap-2'>
                              <p className='text-sm font-semibold text-slate-900'>
                                {item.roomName}
                              </p>
                              <Badge variant={item.isActive ? 'default' : 'secondary'}>
                                {item.isActive ? 'Activo' : 'Finalizado'}
                              </Badge>
                            </div>
                            <p className='mt-1 text-xs text-slate-500'>
                              Inicio: {formatFechaConHora(item.startedAt)}
                              {item.endedAt
                                ? ` — Fin: ${formatFechaConHora(item.endedAt)}`
                                : ' — En curso'}
                            </p>
                            {getClosedReasonLabel(item.closedReason) && (
                              <p className='mt-1 text-xs text-sky-700'>
                                Cierre: {getClosedReasonLabel(item.closedReason)}
                              </p>
                            )}
                            {item.carriedFromPrevious && (
                              <p className='mt-1 text-xs text-amber-700'>
                                Tiempo agregado después de cambiar de habitación.
                              </p>
                            )}
                          </div>

                          <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 md:min-w-[320px]'>
                            <div className='rounded-xl bg-slate-50 px-3 py-2'>
                              <p className='text-[11px] uppercase tracking-wide text-slate-500'>
                                Asignado
                              </p>
                              <p className='text-sm font-semibold text-slate-900'>
                                {formatMinutesLabel(item.assignedMinutes)}
                              </p>
                            </div>
                            <div className='rounded-xl bg-amber-50 px-3 py-2'>
                              <p className='text-[11px] uppercase tracking-wide text-amber-600'>
                                Consumido
                              </p>
                              <p className='text-sm font-semibold text-amber-700'>
                                {formatMinutesLabel(item.consumedMinutes)}
                              </p>
                            </div>
                            <div className='rounded-xl bg-emerald-50 px-3 py-2'>
                              <p className='text-[11px] uppercase tracking-wide text-emerald-600'>
                                Restante
                              </p>
                              <p className='text-sm font-semibold text-emerald-700'>
                                {formatMinutesLabel(item.remainingMinutes)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className='mt-3 text-xs text-slate-500'>
                          Tramo: {formatSoloHora(item.startedAt)}
                          {item.endedAt ? ` - ${formatSoloHora(item.endedAt)}` : ' - En curso'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='rounded-2xl border border-dashed p-4 text-sm text-gray-500'>
                    Esta cuenta no tiene historial de habitación registrado.
                  </div>
                )}
              </div>

              {solicitudesAnulacion.length > 0 && (
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <h3 className='text-sm font-semibold text-gray-700'>Historial de anulación</h3>
                    <span className='text-xs text-gray-500'>
                      {solicitudesAnulacion.length} solicitud
                      {solicitudesAnulacion.length !== 1 ? 'es' : ''}
                    </span>
                  </div>

                  <div className='space-y-3'>
                    {solicitudesAnulacion.map(solicitud => (
                      <div key={solicitud.id} className='rounded-2xl border bg-white p-4 shadow-sm'>
                        <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                          <div className='space-y-1'>
                            <div className='flex items-center gap-2'>
                              <p className='text-sm font-semibold text-slate-900'>
                                {formatCurrencyNoDecimals(solicitud.monto)}
                              </p>
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${getAnulacionBadgeClass(
                                  solicitud.estado
                                )}`}
                              >
                                {solicitud.estado}
                              </span>
                            </div>
                            <p className='text-xs text-slate-500'>
                              Solicitada: {formatFechaConHora(solicitud.fecha_crea)}
                            </p>
                            {solicitud.fecha_mod && solicitud.estado !== 'pendiente' && (
                              <p className='text-xs text-slate-500'>
                                Resuelta: {formatFechaConHora(solicitud.fecha_mod)}
                              </p>
                            )}
                          </div>

                          <div className='text-xs text-slate-500 space-y-1 md:text-right'>
                            <p>Solicita: {solicitud.requested_by_nombre || 'Sin dato'}</p>
                            {solicitud.approved_by_nombre && (
                              <p>Resuelve: {solicitud.approved_by_nombre}</p>
                            )}
                          </div>
                        </div>

                        {solicitud.motivo && (
                          <div className='mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700'>
                            {solicitud.motivo}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-sm font-semibold text-gray-700'>Productos</h3>
                  <span className='text-xs text-gray-500'>
                    {detalleResumen.uniqueProductCount} producto
                    {detalleResumen.uniqueProductCount !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className='space-y-4'>
                  <ProductCartTable
                    productos={productosTabla}
                    readOnly
                    commissionMode='raw'
                    forceShowHostesses={true}
                    anfitrionas={cuenta?.usuarios || []}
                    emptyMessage='No hay productos registrados en esta cuenta'
                  />

                  {}
                  {comisionPorAnfitriona.length > 0 && (
                    <div className='bg-slate-50 dark:bg-slate-800 rounded-lg p-4'>
                      <h4 className='text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3'>
                        Repartición de Comisiones
                      </h4>
                      <div className='space-y-2'>
                        {comisionPorAnfitriona.map(
                          (item: { id: string; nombre: string; comision: number }) => (
                            <div
                              key={item.id}
                              className='flex justify-between items-center text-sm'
                            >
                              <span className='font-medium text-gray-700 dark:text-gray-300'>
                                {item.nombre}
                              </span>
                              <span className='font-semibold text-green-600 dark:text-green-400'>
                                {formatCurrencyNoDecimals(item.comision)}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  <div className='mt-4 flex justify-end'>
                    <div className='text-sm font-semibold text-gray-800 text-right'>
                      <div>SUBTOTAL: {formatCurrencyNoDecimals(detalleResumen.totalSubTotal)}</div>
                      {detalleResumen.totalComision > 0 && (
                        <div className='text-sm text-orange-600 font-normal'>
                          + Comision: {formatCurrencyNoDecimals(detalleResumen.totalComision)}
                        </div>
                      )}
                      <div className='text-md font-bold text-black'>
                        TOTAL ACTUAL:{' '}
                        {formatCurrencyNoDecimals(resumenFinanciero?.total_actual ?? cuenta.total)}
                      </div>
                      <div className='text-xs font-normal text-slate-500'>
                        Total original:{' '}
                        {formatCurrencyNoDecimals(
                          resumenFinanciero?.total_original ?? cuenta.total
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className='text-center py-8'>
              <p className='text-gray-600'>No se encontraron detalles de la cuenta</p>
            </div>
          )}
        </div>

        <div className='flex-shrink-0 border-t px-6 py-4'>
          <div className='flex justify-center gap-2 w-full'>
            <Button
              variant='outline'
              size='sm'
              onClick={localHandleClose}
              className='bg-black text-white rounded-full px-6 hover:scale-105 transition-all duration-200'
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
