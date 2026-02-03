import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { VentaWithDetails } from '@/types/venta';
import { Home, Clock, CreditCard } from 'lucide-react';
import { useTimer } from '@/contexts/TimerContext';

interface SalesDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVenta: VentaWithDetails | null;
  anfitrionaColors: string[];
  metodoPagoLabels: Record<string, string>;
}

function formatFecha(fechaStr?: string) {
  if (!fechaStr) return '-';
  if (fechaStr.includes('T')) {
    const date = new Date(fechaStr);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  }
  const [fecha] = fechaStr.split(' ');
  if (!fecha) return '-';
  const [y, m, d] = fecha.split('-');
  return `${d}-${m}-${y}`;
}

function formatHora(fechaStr?: string) {
  if (!fechaStr) return '-';
  if (fechaStr.includes('T')) {
    const date = new Date(fechaStr);
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  }
  const parts = fechaStr.split(' ');
  if (parts[1]) {
    const [h, m] = parts[1].split(':');
    return `${h}:${m}`;
  }
  return '-';
}

export function SalesDetailModal({
  open,
  onOpenChange,
  selectedVenta,
  anfitrionaColors,
  metodoPagoLabels
}: SalesDetailModalProps) {
  const { getTimerByServicioId, formatTime } = useTimer();

  if (!selectedVenta) return null;

  const timer = getTimerByServicioId(selectedVenta.id);
  const isLowTime = timer && timer.isActive && timer.remainingTime <= 300;

  const hasAnfitrionas = Array.isArray(selectedVenta.usuarios) && selectedVenta.usuarios.length > 0;
  const totalComision = Array.isArray(selectedVenta.detalles)
    ? selectedVenta.detalles.reduce((sum, detalle) => sum + (detalle.comision || 0), 0)
    : 0;
  const subTotal = Array.isArray(selectedVenta.detalles)
    ? selectedVenta.detalles.reduce((sum, detalle) => sum + (detalle.sub_total || 0), 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] max-w-[95vw] sm:w-[56rem] sm:max-w-4xl max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className='px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b flex-shrink-0'>
          <DialogTitle className='text-lg sm:text-xl'>
            Detalles de la Venta - {selectedVenta.codigo || 'Sin código'}
          </DialogTitle>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-4 sm:px-6 py-6'>
          <div className='space-y-8'>
            {/* Header Info Grid - Distribución limpia sin cards */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 pb-6 border-b border-slate-100 dark:border-slate-800'>
              <div className='space-y-1.5'>
                <span className='text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest'>
                  Fecha de Venta
                </span>
                <div className='text-sm font-semibold text-slate-700 dark:text-slate-200'>
                  {formatFecha(selectedVenta.fecha_crea)}
                </div>
              </div>

              <div className='space-y-1.5'>
                <span className='text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest'>
                  Cliente
                </span>
                <div className='text-sm font-semibold text-slate-700 dark:text-slate-200 truncate'>
                  {selectedVenta.cliente_nombre || 'Sin cliente'}
                </div>
              </div>

              <div className='space-y-1.5'>
                <span className='text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest'>
                  Método de Pago
                </span>
                <div>
                  <Badge
                    variant='outline'
                    className='bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold capitalize'
                  >
                    {metodoPagoLabels[selectedVenta.metodo_pago as keyof typeof metodoPagoLabels] ||
                      selectedVenta.metodo_pago}
                  </Badge>
                </div>
              </div>

              {selectedVenta.garzon_nombre && (
                <div className='space-y-1.5'>
                  <span className='text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest'>
                    Garzón
                  </span>
                  <div className='text-sm font-semibold text-slate-700 dark:text-slate-200'>
                    {selectedVenta.garzon_nombre}
                  </div>
                </div>
              )}

              {/* Info de Habitación integrada en el grid si existe */}
              {selectedVenta.habitacion_id &&
                selectedVenta.habitacion_nombre !== 'Sin habitación' && (
                  <>
                    <div className='space-y-1.5'>
                      <span className='text-[10px] sm:text-xs font-bold text-pink-400 uppercase tracking-widest'>
                        Habitación
                      </span>
                      <div className='text-sm font-bold text-pink-600 dark:text-pink-400 flex items-center gap-1.5'>
                        <Home className='w-3.5 h-3.5' />
                        {selectedVenta.habitacion_numero || selectedVenta.habitacion_nombre}
                      </div>
                    </div>

                    <div className='space-y-1.5'>
                      <span className='text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest'>
                        Hora Entrada
                      </span>
                      <div className='text-sm font-semibold text-slate-700 dark:text-slate-200'>
                        {formatHora(selectedVenta.fecha_crea)}
                      </div>
                    </div>

                    <div className='space-y-1.5'>
                      <span className='text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest'>
                        Hora Salida
                      </span>
                      <div className='text-sm font-semibold space-y-0.5'>
                        <div className='flex items-center gap-1.5'>
                          <span className='text-blue-600 dark:text-blue-400 font-bold'>
                            {(() => {
                              try {
                                const rawFecha = selectedVenta.fecha_crea;
                                const dateStr =
                                  typeof rawFecha === 'string'
                                    ? rawFecha
                                    : new Date(rawFecha).toISOString();
                                const isoStr = dateStr.includes('T')
                                  ? dateStr
                                  : dateStr.replace(' ', 'T');
                                const entry = new Date(isoStr);
                                const exit = new Date(
                                  entry.getTime() + (selectedVenta.tiempo || 0) * 60000
                                );
                                return formatHora(exit.toISOString());
                              } catch (e) {
                                return '-';
                              }
                            })()}
                          </span>
                          <span className='text-slate-400 text-[10px]'>
                            ({selectedVenta.tiempo || 0} min)
                          </span>
                        </div>
                      </div>
                    </div>

                    {timer && timer.isActive && (
                      <div className='space-y-1.5'>
                        <span className='text-[10px] sm:text-xs font-bold text-blue-400 uppercase tracking-widest'>
                          Restante
                        </span>
                        <div
                          className={`text-sm font-mono font-black ${isLowTime ? 'text-red-500 animate-pulse' : 'text-blue-500'}`}
                        >
                          {formatTime(timer.remainingTime)}
                        </div>
                      </div>
                    )}
                  </>
                )}
            </div>

            {/* Anfitrionas - Fila dedicada */}
            <div className='space-y-3 pb-2'>
              <div className='flex items-center gap-2'>
                <span className='text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest'>
                  Anfitriona(s) Asignada(s)
                </span>
              </div>
              <div className='flex flex-wrap gap-2'>
                {hasAnfitrionas ? (
                  selectedVenta.usuarios.map((usuario: any, index: number) => (
                    <Badge
                      key={
                        usuario.id
                          ? `modal-usuario-${usuario.id}-${index}`
                          : `modal-user-idx-${index}`
                      }
                      className={`${anfitrionaColors[index % anfitrionaColors.length]} px-3 py-1 text-xs font-bold shadow-sm`}
                    >
                      {usuario.nick || usuario.usuario_nombre || 'Sin nick'}
                    </Badge>
                  ))
                ) : (
                  <Badge
                    variant='secondary'
                    className='text-slate-400 italic bg-slate-50 dark:bg-slate-900'
                  >
                    Venta directa en barra
                  </Badge>
                )}
              </div>
            </div>

            {/* Tabla de productos */}
            <div className='border rounded-lg p-4'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='text-left'>Producto</TableHead>
                    <TableHead className='text-center'>Tipo</TableHead>
                    <TableHead className='text-center'>Cantidad</TableHead>
                    <TableHead className='text-center'>Precio</TableHead>
                    <TableHead className='text-center'>Comisión</TableHead>
                    <TableHead className='text-right'>Sub Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(selectedVenta.detalles) && selectedVenta.detalles.length > 0 ? (
                    selectedVenta.detalles.map((detalle: any, index: number) => {
                      const tieneComision = (detalle.comision || 0) > 0;
                      return (
                        <TableRow key={index}>
                          <TableCell className='font-medium'>
                            {detalle.producto_nombre ||
                              `Producto ID: ${detalle.producto_id}` ||
                              'Sin nombre'}
                          </TableCell>
                          <TableCell className='text-center'>
                            <Badge
                              variant={tieneComision ? 'default' : 'secondary'}
                              className='text-xs'
                            >
                              {tieneComision ? 'Anfitriona' : 'Cliente'}
                            </Badge>
                          </TableCell>
                          <TableCell className='text-center'>{detalle.cantidad || 0}</TableCell>
                          <TableCell className='text-center'>
                            ${(detalle.precio || 0).toLocaleString('es-CL')}
                          </TableCell>
                          <TableCell className='text-center'>
                            <span className={tieneComision ? 'text-green-600 font-semibold' : ''}>
                              ${(detalle.comision || 0).toLocaleString('es-CL')}
                            </span>
                          </TableCell>
                          <TableCell className='text-right font-medium'>
                            ${(detalle.sub_total || 0).toLocaleString('es-CL')}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className='text-center text-muted-foreground'>
                        No hay detalles de productos disponibles
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <Separator className='my-4' />

              {/* Resumen de totales */}
              <div className='space-y-2'>
                <div className='flex justify-between items-center text-sm'>
                  <span className='text-muted-foreground'>SUBTOTAL:</span>
                  <span className='font-semibold'>${subTotal.toLocaleString('es-CL')}</span>
                </div>
                {selectedVenta.propina && selectedVenta.propina > 0 && (
                  <div className='flex justify-between items-center text-sm'>
                    <span className='text-blue-600'>+ Propina:</span>
                    <span className='text-blue-600 font-medium'>
                      ${selectedVenta.propina.toLocaleString('es-CL')}
                    </span>
                  </div>
                )}
                <Separator />
                <div className='flex justify-between items-center text-base'>
                  <span className='font-bold'>TOTAL:</span>
                  <span className='font-bold text-lg'>
                    ${(selectedVenta.total || 0).toLocaleString('es-CL')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con botón - fijo en la parte inferior */}
        <div className='flex-shrink-0 border-t px-4 sm:px-6 py-4 bg-white'>
          <div className='flex justify-center'>
            <Button
              onClick={() => onOpenChange(false)}
              size='sm'
              variant='outline'
              className='rounded-full px-6 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white'
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
