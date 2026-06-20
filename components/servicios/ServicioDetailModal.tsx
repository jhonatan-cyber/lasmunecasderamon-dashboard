import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Calendar, Clock, Tag, User, DollarSign, CreditCard, Home } from 'lucide-react';
import { ServicioWithDetails } from '@/types/servicio';
import { formatCurrency } from '@/lib/business/salesUtils';
import { formatLongDateEs, formatShortTimeEs } from '@/lib/utils/calendarUtils';

interface ServicioDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedServicio: ServicioWithDetails | null;
  anfitrionaColors: string[];
  metodoPagoLabels: Record<string, string>;
}

export function ServicioDetailModal({
  open,
  onOpenChange,
  selectedServicio,
  anfitrionaColors,
  metodoPagoLabels
}: ServicioDetailModalProps) {
  if (!selectedServicio) return null;

  const hasAnfitrionas =
    selectedServicio.anfitrionas_nombres && selectedServicio.anfitrionas_nombres.length > 0;

  
  const precioServicioInput = Number(selectedServicio.precio_servicio) || 0;
  const habitacionComision = Number(selectedServicio.habitacion_comision) || 0;
  const mostrarBotonEditar = precioServicioInput === 0 && habitacionComision > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] flex flex-col p-0 bg-white dark:bg-neutral-900'>
        <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
          <DialogTitle className='text-center text-lg font-bold text-black dark:text-neutral-100'>
            Información del Servicio
          </DialogTitle>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4'>
          <div className='space-y-6'>
            {}
            <div className='grid grid-cols-2 gap-6'>
              <div className='space-y-3'>
                <div className='flex items-center gap-2'>
                  <Calendar className='text-gray-500 dark:text-neutral-400 w-4' />
                  <Label className='text-sm font-medium text-black dark:text-neutral-200'>
                    Fecha:
                  </Label>
                  <span className='text-sm text-black dark:text-neutral-100'>
                    {selectedServicio.fecha_crea
                      ? formatLongDateEs(selectedServicio.fecha_crea)
                      : 'Sin fecha'}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <Clock className='text-gray-500 dark:text-neutral-400 w-4' />
                  <Label className='text-sm font-medium text-black dark:text-neutral-200'>
                    Hora:
                  </Label>
                  <span className='text-sm text-black dark:text-neutral-100'>
                    {selectedServicio.fecha_crea
                      ? formatShortTimeEs(selectedServicio.fecha_crea)
                      : 'Sin hora'}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <Tag className='text-gray-500 dark:text-neutral-400 w-4' />
                  <Label className='text-sm font-medium text-black dark:text-neutral-200'>
                    Código:
                  </Label>
                  <span className='text-sm font-mono bg-gray-100 dark:bg-neutral-800 text-black dark:text-neutral-100 px-2 py-1 rounded'>
                    {selectedServicio.codigo}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <User className='text-gray-500 dark:text-neutral-400 w-4' />
                  <Label className='text-sm font-medium text-black dark:text-neutral-200'>
                    Cliente:
                  </Label>
                  <span className='text-sm text-black dark:text-neutral-100'>
                    {selectedServicio.cliente_nombre || 'Sin cliente'}
                  </span>
                </div>
              </div>

              <div className='space-y-3'>
                <div className='flex items-center gap-2'>
                  <Home className='text-gray-500 dark:text-neutral-400 w-4' />
                  <Label className='text-sm font-medium text-black dark:text-neutral-200'>
                    Habitación:
                  </Label>
                  <span className='text-sm text-black dark:text-neutral-100'>
                    {selectedServicio.habitacion_numero || 'Sin habitación'}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <Clock className='text-gray-500 dark:text-neutral-400 w-4' />
                  <Label className='text-sm font-medium text-black dark:text-neutral-200'>
                    Tiempo:
                  </Label>
                  <span className='text-sm text-black dark:text-neutral-100'>
                    {selectedServicio.tiempo} minutos
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <CreditCard className='text-gray-500 dark:text-neutral-400 w-4' />
                  <Label className='text-sm font-medium text-black dark:text-neutral-200'>
                    Método de Pago:
                  </Label>
                  <Badge
                    variant='outline'
                    className='text-xs border-transparent bg-black text-white dark:bg-white dark:text-black'
                  >
                    {selectedServicio.metodo_pago
                      ? metodoPagoLabels[selectedServicio.metodo_pago] ||
                        selectedServicio.metodo_pago
                      : 'No especificado'}
                  </Badge>
                </div>
              </div>
            </div>

            {}
            {hasAnfitrionas && (
              <div className='space-y-3'>
                <Label className='text-sm font-medium flex items-center gap-2 text-black dark:text-neutral-200'>
                  <User className='text-gray-500 dark:text-neutral-400 w-4' />
                  Anfitrionas:
                </Label>
                <div className='flex flex-wrap gap-2'>
                  {selectedServicio.anfitrionas_nombres?.split(',').map((anfitriona, index) => (
                    <Badge
                      key={index}
                      className='text-xs bg-black text-white dark:bg-white dark:text-black'
                    >
                      {anfitriona.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {}
            <div className='space-y-3'>
              <Label className='text-sm font-medium flex items-center gap-2 text-black dark:text-neutral-200'>
                <DollarSign className='text-gray-500 dark:text-neutral-400 w-4' />
                Información Financiera:
              </Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='text-black dark:text-neutral-200'>Concepto</TableHead>
                    <TableHead className='text-right text-black dark:text-neutral-200'>
                      Monto
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className='text-black dark:text-neutral-100'>
                      Precio Habitación
                    </TableCell>
                    <TableCell className='text-right text-black dark:text-neutral-100'>
                      {formatCurrency(Number(selectedServicio.precio_habitacion) || 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className='text-black dark:text-neutral-100'>
                      Precio Servicio
                    </TableCell>
                    <TableCell className='text-right text-black dark:text-neutral-100'>
                      {formatCurrency(
                        (Number(selectedServicio.precio_servicio) || 0) *
                          (Number(selectedServicio.total_usuarios) || 1)
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className='text-black dark:text-neutral-100'>IVA</TableCell>
                    <TableCell className='text-right text-black dark:text-neutral-100'>
                      {formatCurrency(Number(selectedServicio.iva) || 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow className='font-semibold'>
                    <TableCell className='text-black dark:text-neutral-100'>Subtotal</TableCell>
                    <TableCell className='text-right text-black dark:text-neutral-100'>
                      {formatCurrency(Number(selectedServicio.sub_total) || 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow className='font-bold bg-gray-50'>
                    <TableCell className='text-black dark:text-neutral-100'>Total</TableCell>
                    <TableCell className='text-right text-lg text-black dark:text-neutral-100'>
                      {formatCurrency(Number(selectedServicio.total) || 0)}
                    </TableCell>
                  </TableRow>
                  {}
                  <TableRow className='bg-green-50 dark:bg-green-900/20'>
                    <TableCell className='text-green-700 dark:text-green-400 font-semibold'>
                      Total Comisión
                    </TableCell>
                    <TableCell className='text-right text-green-700 dark:text-green-400 font-bold'>
                      {formatCurrency(
                        (Number(selectedServicio.precio_servicio) || 0) *
                          (Number(selectedServicio.total_usuarios) || 1)
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow className='bg-green-50 dark:bg-green-900/20'>
                    <TableCell className='text-green-700 dark:text-green-400'>
                      Comisión por Anfitriona
                    </TableCell>
                    <TableCell className='text-right text-green-700 dark:text-green-400 font-medium'>
                      {formatCurrency(Number(selectedServicio.precio_servicio) || 0)} c/u
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className='flex-shrink-0 border-t px-6 py-4'>
          <div className='flex justify-center gap-4'>
            {mostrarBotonEditar && (
              <Button
                variant='outline'
                className='rounded-full hover:scale-105 transition-all duration-200 bg-blue-600 text-white hover:bg-blue-700'
                disabled
              >
                Editar Servicio
              </Button>
            )}
            <Button
              variant='outline'
              onClick={() => onOpenChange(false)}
              className='rounded-full hover:scale-105 transition-all duration-200 bg-black text-white'
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
