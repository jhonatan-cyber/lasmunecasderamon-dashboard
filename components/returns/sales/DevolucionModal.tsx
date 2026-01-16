import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { VentaWithDetails } from '@/types/venta';
import { formatCurrency } from '@/lib/salesUtils';

interface DevolucionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVenta: VentaWithDetails | null;
  motivoDevolucion: string;
  onMotivoChange: (motivo: string) => void;
  onConfirmar: () => void;
}

export const DevolucionModal = ({
  isOpen,
  onOpenChange,
  selectedVenta,
  motivoDevolucion,
  onMotivoChange,
  onConfirmar
}: DevolucionModalProps) => (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] flex flex-col p-0">
      <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
        <DialogTitle>Procesar Devolución</DialogTitle>
        <DialogDescription>
          ¿Está seguro de que desea procesar la devolución de esta venta?
        </DialogDescription>
      </DialogHeader>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className='space-y-4'>
          <div>
            <Label htmlFor='motivo'>Motivo de la devolución:</Label>
            <Textarea
              id='motivo'
              value={motivoDevolucion}
              onChange={e => onMotivoChange(e.target.value)}
              placeholder='Ingrese el motivo de la devolución...'
              rows={3}
            />
          </div>
          {selectedVenta && (
            <div className='bg-gray-50 p-4 rounded-lg'>
              <p className='text-sm text-gray-600'>
                <strong>Venta:</strong> {selectedVenta.codigo} - {formatCurrency(selectedVenta.total)}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 border-t px-6 py-4">
        <div className="flex justify-end gap-2">
          <Button
            size='sm'
            className='rounded-full  hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white'
            variant='outline'
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            size='sm'
            variant='outline'
            className='bg-black text-white rounded-full hover:scale-105 transition-all duration-200'
            onClick={onConfirmar}
          >
            Solicitar Devolución
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);
