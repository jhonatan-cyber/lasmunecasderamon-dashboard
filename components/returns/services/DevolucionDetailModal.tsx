import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Calendar,
  Clock,
  Tag,
  User,
  DollarSign,
  CreditCard,
  Home,
  Beer,
  AlertTriangle
} from 'lucide-react';
import { ServicioWithDetails } from '@/types/servicio';
import { formatCurrency } from '@/lib/business/salesUtils';
import { formatLongDateEs, formatShortTimeEs } from '@/lib/utils/calendarUtils';

interface DevolucionDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedServicio: ServicioWithDetails | null;
  anfitrionaColors: string[];
  metodoPagoLabels: Record<string, string>;
  motivoDevolucion: string;
  onMotivoChange: (motivo: string) => void;
  onConfirmar: () => void;
}

export function DevolucionDetailModal({
  open,
  onOpenChange,
  selectedServicio,
  anfitrionaColors,
  metodoPagoLabels,
  motivoDevolucion,
  onMotivoChange,
  onConfirmar
}: DevolucionDetailModalProps) {
  if (!selectedServicio) return null;

  const hasAnfitrionas =
    selectedServicio.anfitrionas_nombres && selectedServicio.anfitrionas_nombres.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-3xl max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
          <DialogTitle className='text-center text-lg font-bold mb-2'>
            Devolución de Servicio
          </DialogTitle>
          <DialogDescription className='text-center'>
            Revisa los detalles del servicio antes de procesar la devolución
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4'>
          <div className='space-y-6'>
            {}
            <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
              <div className='flex items-center gap-2'>
                <AlertTriangle className='text-red-500 w-4 h-4' />
                <span className='text-sm font-medium text-red-800'>
                  Atención: Esta acción procesará la devolución del servicio
                </span>
              </div>
            </div>

            {}
            <div className='grid grid-cols-2 gap-6'>
              <div className='space-y-3'>
                <div className='flex items-center gap-2'>
                  <Calendar className='text-gray-500 w-4 h-4' />
                  <Label className='text-sm font-medium'>Fecha:</Label>
                  <span className='text-sm'>
                    {selectedServicio.fecha_crea
                      ? formatLongDateEs(selectedServicio.fecha_crea)
                      : 'Sin fecha'}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <Clock className='text-gray-500 w-4 h-4' />
                  <Label className='text-sm font-medium'>Hora:</Label>
                  <span className='text-sm'>
                    {selectedServicio.fecha_crea
                      ? formatShortTimeEs(selectedServicio.fecha_crea)
                      : 'Sin hora'}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <Tag className='text-gray-500 w-4 h-4' />
                  <Label className='text-sm font-medium'>Código:</Label>
                  <span className='text-sm font-mono bg-gray-100 px-2 py-1 rounded'>
                    {selectedServicio.codigo}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <User className='text-gray-500 w-4 h-4' />
                  <Label className='text-sm font-medium'>Cliente:</Label>
                  <span className='text-sm'>
                    {selectedServicio.cliente_nombre || 'Sin cliente'}
                  </span>
                </div>
              </div>

              <div className='space-y-3'>
                <div className='flex items-center gap-2'>
                  <Home className='text-gray-500 w-4 h-4' />
                  <Label className='text-sm font-medium'>Habitación:</Label>
                  <span className='text-sm'>
                    {selectedServicio.habitacion_numero || 'Sin habitación'}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <Clock className='text-gray-500 w-4 h-4' />
                  <Label className='text-sm font-medium'>Tiempo:</Label>
                  <span className='text-sm'>{selectedServicio.tiempo} minutos</span>
                </div>
                <div className='flex items-center gap-2'>
                  <CreditCard className='text-gray-500 w-4 h-4' />
                  <Label className='text-sm font-medium'>Método de Pago:</Label>
                  <Badge
                    variant='outline'
                    className='text-xs bg-black text-white dark:bg-white dark:text-black'
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
                <Label className='text-sm font-medium flex items-center gap-2'>
                  <User className='text-gray-500 w-4 h-4' />
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
              <Label className='text-sm font-medium flex items-center gap-2'>
                <DollarSign className='text-gray-500 w-4 h-4' />
                Información Financiera:
              </Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead className='text-right'>Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Precio Habitación</TableCell>
                    <TableCell className='text-right'>
                      {formatCurrency(selectedServicio.precio_habitacion)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Precio Servicio</TableCell>
                    <TableCell className='text-right'>
                      {formatCurrency(selectedServicio.precio_servicio)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>IVA</TableCell>
                    <TableCell className='text-right'>
                      {formatCurrency(selectedServicio.iva)}
                    </TableCell>
                  </TableRow>
                  <TableRow className='font-semibold'>
                    <TableCell>Subtotal</TableCell>
                    <TableCell className='text-right'>
                      {formatCurrency(selectedServicio.sub_total)}
                    </TableCell>
                  </TableRow>
                  <TableRow className='font-bold bg-gray-50'>
                    <TableCell>Total a Devolver</TableCell>
                    <TableCell className='text-right text-lg text-red-600'>
                      {formatCurrency(selectedServicio.total)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {}
            <div className='grid grid-cols-2 gap-6'>
              <div className='space-y-3'>
                <Label className='text-sm font-medium flex items-center gap-2'>
                  <Clock className='text-gray-500 w-4 h-4' />
                  Detalles del Servicio:
                </Label>
                <div className='bg-blue-50 p-4 rounded-lg space-y-2'>
                  <div className='flex justify-between'>
                    <span className='text-sm text-gray-600'>Tiempo del servicio:</span>
                    <span className='text-sm font-medium'>{selectedServicio.tiempo} minutos</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-sm text-gray-600'>Total usuarios:</span>
                    <span className='text-sm font-medium'>
                      {selectedServicio.total_usuarios || 0}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-sm text-gray-600'>Cliente ID:</span>
                    <span className='text-sm font-medium'>{selectedServicio.cliente_id}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-sm text-gray-600'>Habitación ID:</span>
                    <span className='text-sm font-medium'>{selectedServicio.habitacion_id}</span>
                  </div>
                </div>
              </div>

              <div className='space-y-3'>
                <Label className='text-sm font-medium flex items-center gap-2'>
                  <Tag className='text-gray-500 w-4 h-4' />
                  Información del Sistema:
                </Label>
                <div className='bg-gray-50 p-4 rounded-lg space-y-2'>
                  <div className='flex justify-between'>
                    <span className='text-sm text-gray-600'>ID del servicio:</span>
                    <span className='text-sm font-medium'>{selectedServicio.id_servicio}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-sm text-gray-600'>Código:</span>
                    <span className='text-sm font-medium font-mono'>{selectedServicio.codigo}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-sm text-gray-600'>Estado:</span>
                    <Badge
                      variant={selectedServicio.estado === 1 ? 'default' : 'secondary'}
                      className={selectedServicio.estado === 1 ? 'bg-green-500' : 'bg-gray-500'}
                    >
                      {selectedServicio.estado === 1 ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className='space-y-3'>
              <Label htmlFor='motivo' className='text-sm font-medium flex items-center gap-2'>
                <AlertTriangle className='text-red-500 w-4 h-4' />
                Motivo de la Devolución:
              </Label>
              <Textarea
                id='motivo'
                value={motivoDevolucion}
                onChange={e => onMotivoChange(e.target.value)}
                placeholder='Ingrese el motivo de la devolución del servicio...'
                rows={4}
                className='border-red-200 focus:border-red-500'
              />
            </div>
          </div>
        </div>

        <div className='flex-shrink-0 border-t px-6 py-4'>
          <div className='flex justify-end gap-2'>
            <Button variant='outline' onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={onConfirmar}
              className='bg-red-600 hover:bg-red-700'
              disabled={!motivoDevolucion.trim()}
            >
              Confirmar Devolución
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
