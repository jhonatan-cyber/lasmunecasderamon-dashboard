'use client';

import { useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { formatLongDateEs } from '@/lib/utils/calendarUtils';
import { useCuentaDetail } from '@/hooks/cuentas';
import { summarizeCuentaDetalles } from '@/lib/utils/cuentas';
import { ProductCartTable } from '../tables/ProductCartTable';

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

export default function CuentaDetailModal({ open, onOpenChange, cuentaId }: CuentaDetailModalProps) {
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

  const productosTabla = useMemo(
    () =>
      detalleResumen.groupedDetalles.map((detalle, index) => ({
        id_producto: detalle.id_producto ?? detalle.producto_id ?? detalle.agrupacionKey ?? index,
        nombre:
          detalle.producto ||
          detalle.nombre ||
          `Producto ID: ${detalle.id_producto ?? detalle.producto_id ?? '-'}`,
        precio: detalle.precio || 0,
        cantidad: detalle.cantidad || 0,
        sub_total: detalle.sub_total || 0,
        categoria_nombre: detalle.categoria || detalle.categoria_nombre || '',
        comision: detalle.comision || 0
      })),
    [detalleResumen.groupedDetalles]
  );

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
      <DialogContent className='sm:max-w-4xl max-h-[90vh] flex flex-col p-0 bg-white rounded-xl shadow-md'>
        <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
          <div className='flex items-center justify-center'>
            <DialogTitle className='text-start text-xl font-semibold tracking-tight'>
              Detalles de Cuenta
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4'>
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
                      <b>Código:</b>
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
                    {estadoBadge && <Badge variant={estadoBadge.variant}>{estadoBadge.label}</Badge>}
                  </div>
                  <div>
                    <span className='font-medium'>
                      <b>Habitación:</b>
                    </span>{' '}
                    <span className='font-normal'>
                      {cuenta.habitacion_numero || 'Sin habitación'}
                    </span>
                  </div>
                </div>
              </div>

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
                    emptyMessage='No hay productos registrados en esta cuenta'
                  />

                  <div className='mt-4 flex justify-end'>
                    <div className='text-sm font-semibold text-gray-800'>
                      SUBTOTAL: {formatCurrencyNoDecimals(detalleResumen.totalSubTotal)}
                      {detalleResumen.totalComision > 0 && (
                        <div className='text-sm text-orange-600 font-normal'>
                          + Comisión: {formatCurrencyNoDecimals(detalleResumen.totalComision)}
                        </div>
                      )}
                      <div className='text-md font-bold text-black'>
                        TOTAL: {formatCurrencyNoDecimals(cuenta.total)}
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
