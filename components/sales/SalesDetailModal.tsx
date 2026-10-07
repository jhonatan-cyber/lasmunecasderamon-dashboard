'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VentaWithDetails } from '@/types/venta';
import { SalesDistribution } from './SalesDistribution';
import { formatCurrency, statusColors, statusLabels } from '@/lib/business/salesUtils';
import { esShot, etiquetaVentaDetalle, agruparProductosVenta } from '@/lib/sales/ventaDetalle';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import {
  ShoppingBag,
  User,
  Home,
  CreditCard,
  Users,
  Clock,
  DollarSign,
  Receipt,
  Hash
} from 'lucide-react';

interface SalesDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVenta: VentaWithDetails | null;
  anfitrionaColors: string[];
  metodoPagoLabels: Record<string, string>;
}

export function SalesDetailModal({
  open,
  onOpenChange,
  selectedVenta,
  anfitrionaColors,
  metodoPagoLabels
}: SalesDetailModalProps) {
  if (!selectedVenta) return null;
  const productosVendidos = agruparProductosVenta(selectedVenta.detalles ?? []);

  const hostesses = Array.from(
    new Set(
      (selectedVenta.usuarios?.map(u => u.nick || u.usuario_nombre).filter(Boolean) ||
        selectedVenta.anfitrionas_nicks
          ?.split(',')
          .map(nick => nick.trim())
          .filter(Boolean) ||
        []) as string[]
    )
  );

  const statusColor = statusColors[selectedVenta.estado] || 'bg-gray-100 text-gray-800';
  const statusLabel = statusLabels[selectedVenta.estado] || 'Desconocido';
  const metodoPagoLabel = metodoPagoLabels[selectedVenta.metodo_pago] || selectedVenta.metodo_pago;

  const formatFecha = (fecha: string) => {
    try {
      const date = new Date(fecha.replace(' ', 'T'));
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[95vh] p-0 border-none shadow-2xl rounded-3xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col'>
        {}
        <DialogHeader className='px-8 pt-8 pb-4 bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-gray-800'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl'>
                <Receipt className='h-6 w-6 text-blue-600' />
              </div>
              <div>
                <DialogTitle className='text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight'>
                  Detalle de Venta
                </DialogTitle>
                <div className='flex items-center gap-2 text-sm text-gray-500 font-medium'>
                  <Hash className='h-3.5 w-3.5' />
                  {selectedVenta.codigo}
                </div>
              </div>
            </div>
            <Badge
              className={`rounded-full px-3 py-1 border-none font-bold uppercase tracking-tighter text-[10px] ${statusColor}`}
            >
              {statusLabel}
            </Badge>
          </div>
        </DialogHeader>

        {}
        <div className='flex-1 overflow-y-auto px-8 py-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800'>
          {}
          <div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
            <Card className='rounded-3xl border-none shadow-md bg-emerald-50/50 dark:bg-emerald-900/20 overflow-hidden'>
              <CardContent className='p-4 flex items-center gap-3'>
                <div className='h-10 w-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center'>
                  <DollarSign className='h-5 w-5 text-emerald-600' />
                </div>
                <div>
                  <p className='text-[10px] uppercase font-black text-emerald-400 tracking-wider'>
                    Total
                  </p>
                  <p className='text-lg font-black text-emerald-600'>
                    ${formatCurrency(selectedVenta.total)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className='rounded-3xl border-none shadow-md bg-blue-50/50 dark:bg-blue-900/20 overflow-hidden'>
              <CardContent className='p-4 flex items-center gap-3'>
                <div className='h-10 w-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center'>
                  <CreditCard className='h-5 w-5 text-blue-600' />
                </div>
                <div>
                  <p className='text-[10px] uppercase font-black text-blue-400 tracking-wider'>
                    Pago
                  </p>
                  <p className='text-sm font-black text-gray-900 dark:text-white capitalize'>
                    {metodoPagoLabel}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className='rounded-3xl border-none shadow-md bg-amber-50/50 dark:bg-amber-900/20 overflow-hidden'>
              <CardContent className='p-4 flex items-center gap-3'>
                <div className='h-10 w-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center'>
                  <DollarSign className='h-5 w-5 text-amber-600' />
                </div>
                <div>
                  <p className='text-[10px] uppercase font-black text-amber-400 tracking-wider'>
                    Propina
                  </p>
                  <p className='text-sm font-black text-gray-900 dark:text-white'>
                    ${formatCurrency(selectedVenta.propina)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {}
          <div className='space-y-4'>
            {}
            <div className='flex items-center gap-3'>
              <Clock className='w-4 h-4 text-gray-400 shrink-0' />
              <div>
                <span className='text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider block font-bold'>
                  Fecha
                </span>
                <span className='text-sm font-medium text-gray-900 dark:text-neutral-100'>
                  {formatFecha(selectedVenta.fecha_crea)}
                </span>
              </div>
            </div>

            {}
            <div className='flex items-center gap-3'>
              <Home className='w-4 h-4 text-indigo-500 shrink-0' />
              <div>
                <span className='text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider block font-bold'>
                  Habitación
                </span>
                <span className='text-sm font-medium text-gray-900 dark:text-neutral-100'>
                  {selectedVenta.habitacion_numero ||
                    selectedVenta.habitacion_nombre ||
                    'Sin habitación'}
                  {selectedVenta.tiempo ? ` · ${selectedVenta.tiempo} min` : ''}
                </span>
              </div>
            </div>

            {}
            <div className='flex items-center gap-3'>
              <User className='w-4 h-4 text-blue-500 shrink-0' />
              <div>
                <span className='text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider block font-bold'>
                  Cliente
                </span>
                <span className='text-sm font-medium text-gray-900 dark:text-neutral-100'>
                  {selectedVenta.cliente_nombre?.toLowerCase() === 'sin cliente' ||
                  !selectedVenta.cliente_nombre
                    ? 'Cliente sin registrar'
                    : selectedVenta.cliente_nombre}
                </span>
              </div>
            </div>

            {}
            <div className='flex items-center gap-3'>
              <User className='w-4 h-4 text-green-500 shrink-0' />
              <div>
                <span className='text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider block font-bold'>
                  Vendido por
                </span>
                <span className='text-sm font-medium text-gray-900 dark:text-neutral-100'>
                  {[selectedVenta.cajero_nombre, selectedVenta.cajero_apellido]
                    .filter(Boolean)
                    .join(' ') ||
                    selectedVenta.cajero_nick ||
                    '—'}
                  {selectedVenta.cajero_nick ? ` (@${selectedVenta.cajero_nick})` : ''}
                </span>
              </div>
            </div>

            {}
            {selectedVenta.pedido_id && (
              <div className='flex items-center gap-3'>
                <Receipt className='w-4 h-4 text-amber-500 shrink-0' />
                <div>
                  <span className='text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider block font-bold'>
                    Pedido por
                  </span>
                  <span className='text-sm font-medium text-gray-900 dark:text-neutral-100'>
                    {selectedVenta.garzon_nombre || selectedVenta.garzon_nick || '—'}
                    {selectedVenta.garzon_nick ? ` (@${selectedVenta.garzon_nick})` : ''}
                  </span>
                </div>
              </div>
            )}

            {}
            <div className='flex items-start gap-3'>
              <Users className='w-4 h-4 text-purple-500 shrink-0 mt-1' />
              <div className='flex-1'>
                <span className='text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider block font-bold'>
                  Anfitrionas
                </span>
                <div className='flex flex-wrap gap-1.5 mt-1'>
                  {hostesses.length > 0 ? (
                    hostesses.map((nick, idx) => (
                      <Badge
                        key={idx}
                        className={`rounded-full px-3 py-1 border-none font-bold text-[10px] uppercase tracking-tighter ${anfitrionaColors[idx % anfitrionaColors.length]}`}
                      >
                        {nick}
                      </Badge>
                    ))
                  ) : (
                    <span className='text-xs text-gray-400 dark:text-gray-500 italic'>
                      Sin anfitrionas
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {}
          <div>
            <div className='flex items-center gap-2 mb-3'>
              <ShoppingBag className='w-4 h-4 text-orange-500' />
              <h4 className='text-sm font-black uppercase tracking-widest text-gray-400'>
                Productos
              </h4>
            </div>

            {selectedVenta.detalles && selectedVenta.detalles.length > 0 ? (
              <div className='bg-white dark:bg-slate-900/40 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden'>
                <div className='divide-y divide-gray-100 dark:divide-gray-800'>
                  {productosVendidos.map((det, idx) => (
                    <div
                      key={idx}
                      className='flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors'
                    >
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2'>
                          <span className='text-sm font-semibold text-gray-900 dark:text-white truncate'>
                            {det.producto_nombre || 'Producto'}
                          </span>
                          {esShot(det) && (
                            <Badge
                              variant='secondary'
                              className='rounded-full text-[10px] font-bold whitespace-nowrap'
                            >
                              {etiquetaVentaDetalle(det)}
                            </Badge>
                          )}
                        </div>
                        <span className='text-[10px] text-gray-400 font-medium'>
                          ${formatCurrency(det.precio)} c/u · Comisión: $
                          {formatCurrency(det.comision)}
                        </span>
                      </div>
                      <div className='flex items-center gap-4'>
                        <Badge variant='outline' className='rounded-full text-xs font-bold'>
                          x{det.cantidad}
                        </Badge>
                        <span className='font-black text-emerald-600 text-sm min-w-[80px] text-right'>
                          ${formatCurrency(det.sub_total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {}
                <div className='px-5 py-3.5 bg-gray-50/80 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-800'>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='font-bold text-gray-500 uppercase tracking-wide text-[10px]'>
                      Subtotal
                    </span>
                    <span className='font-bold text-gray-700 dark:text-gray-300'>
                      ${formatCurrency(selectedVenta.sub_total)}
                    </span>
                  </div>
                  {selectedVenta.propina > 0 && (
                    <div className='flex items-center justify-between text-sm mt-1'>
                      <span className='font-bold text-gray-500 uppercase tracking-wide text-[10px]'>
                        Propina
                      </span>
                      <span className='font-bold text-amber-600'>
                        ${formatCurrency(selectedVenta.propina)}
                      </span>
                    </div>
                  )}
                  <div className='flex items-center justify-between text-sm mt-2 pt-2 border-t border-gray-200 dark:border-gray-700'>
                    <span className='font-black text-gray-900 dark:text-white uppercase tracking-wide text-xs'>
                      Total
                    </span>
                    <span className='font-black text-emerald-600 text-lg'>
                      ${formatCurrency(selectedVenta.total)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className='text-center py-8 bg-gray-50 dark:bg-slate-800/30 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800'>
                <p className='text-gray-400 font-medium tracking-tight'>
                  No se encontraron productos
                </p>
              </div>
            )}
          </div>
          <SalesDistribution
            title='Distribución de comisión entre anfitrionas'
            rows={selectedVenta.comisiones_detalle ?? []}
            defaultRole='Anfitriona'
          />
          <SalesDistribution
            title='Distribución de propina entre garzones, cajeros y barman'
            rows={selectedVenta.propinas_detalle ?? []}
          />
        </div>

        {}
        <DialogFooter className='px-8 py-4 bg-gray-50/50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center sm:justify-center'>
          <Button
            onClick={() => onOpenChange(false)}
            variant='outline'
            className='rounded-full px-8 font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-200'
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
