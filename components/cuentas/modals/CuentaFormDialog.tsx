'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useCuentas } from '@/hooks/caja/useCuentas';
import { useCuentaFormLogic } from '@/hooks/cuentas';
import { toast } from 'sonner';
import {
  formatCurrencyNoDecimals,
  formatNumberInput,
  parseNumberInput
} from '@/lib/utils/formatters';
import { CreateCuentaRequest } from '@/types/cuenta';

interface CuentaFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CuentaFormDialog({ open, onClose, onSuccess }: CuentaFormDialogProps) {
  const { createCuenta } = useCuentas();
  const {
    codigo,
    clienteId,
    habitacionId,
    detalles,
    loading,
    setCodigo,
    setClienteId,
    setHabitacionId,
    setLoading,
    subTotal,
    totalComision,
    total,
    addDetalle,
    updateDetalle,
    removeDetalle,
    validateForm,
    resetForm
  } = useCuentaFormLogic();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Código, cliente y al menos un detalle válido son requeridos');
      return;
    }

    setLoading(true);
    try {
      const cuentaData: CreateCuentaRequest = {
        codigo,
        cliente_id: clienteId ? parseInt(clienteId, 10) : undefined,
        habitacion_id: habitacionId ? parseInt(habitacionId, 10) : undefined,
        total_comision: totalComision,
        sub_total: subTotal,
        total,
        detalles: detalles.map(d => ({
          producto_id: d.producto_id,
          precio: d.precio,
          cantidad: d.cantidad,
          sub_total: d.sub_total,
          comision: d.comision
        }))
      };

      await createCuenta(cuentaData);

      toast.success('Cuenta creada exitosamente');
      handleClose();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAddDetalle = () => {
    addDetalle({
      producto_id: detalles.length + 1,
      precio: 0,
      cantidad: 1,
      sub_total: 0,
      comision: 0
    });
  };

  const handleUpdateDetalle = (
    index: number,
    field: 'producto_id' | 'precio' | 'cantidad' | 'comision',
    value: string | number
  ) => {
    updateDetalle(index, { [field]: value });
  };

  const handleRemoveDetalle = (index: number) => {
    if (detalles.length > 1) {
      removeDetalle(index);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-[800px] max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
          <DialogTitle className='text-center text-2xl font-semibold'>Nueva Cuenta</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='flex flex-col flex-1'>
          <div className='flex-1 overflow-y-auto px-6 py-4'>
            <div className='space-y-6'>
              {}
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div>
                  <Label htmlFor='codigo' className='text-sm font-medium'>
                    Código <span className='text-red-500'>*</span>
                  </Label>
                  <Input
                    id='codigo'
                    value={codigo}
                    onChange={e => setCodigo(e.target.value)}
                    placeholder='Ej: CUENTA-001'
                    className='mt-1'
                  />
                </div>
                <div>
                  <Label htmlFor='cliente' className='text-sm font-medium'>
                    Cliente ID <span className='text-red-500'>*</span>
                  </Label>
                  <Input
                    id='cliente'
                    type='number'
                    value={clienteId}
                    onChange={e => setClienteId(e.target.value)}
                    placeholder='Ej: 1'
                    className='mt-1'
                  />
                </div>
                <div>
                  <Label htmlFor='habitacion' className='text-sm font-medium'>
                    Habitación ID
                  </Label>
                  <Input
                    id='habitacion'
                    type='number'
                    value={habitacionId}
                    onChange={e => setHabitacionId(e.target.value)}
                    placeholder='Ej: 101'
                    className='mt-1'
                  />
                </div>
              </div>

              {}
              <div>
                <div className='flex justify-between items-center mb-4'>
                  <Label className='text-sm font-medium'>Detalles de la cuenta</Label>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleAddDetalle}
                    className='text-xs'
                  >
                    + Agregar Producto
                  </Button>
                </div>

                <div className='space-y-4'>
                  {detalles.map((detalle, index) => (
                    <div
                      key={index}
                      className='grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border border-gray-200 rounded-lg'
                    >
                      <div>
                        <Label className='text-xs'>Producto ID</Label>
                        <Input
                          type='number'
                          value={detalle.producto_id}
                          onChange={e =>
                            handleUpdateDetalle(index, 'producto_id', parseInt(e.target.value))
                          }
                          className='text-sm'
                        />
                      </div>
                      <div>
                        <Label className='text-xs'>Precio</Label>
                        <Input
                          type='text'
                          inputMode='numeric'
                          value={detalle.precio ? formatNumberInput(detalle.precio) : ''}
                          onChange={e =>
                            handleUpdateDetalle(index, 'precio', parseNumberInput(e.target.value))
                          }
                          className='text-sm'
                        />
                      </div>
                      <div>
                        <Label className='text-xs'>Cantidad</Label>
                        <Input
                          type='number'
                          value={detalle.cantidad}
                          onChange={e =>
                            handleUpdateDetalle(index, 'cantidad', parseInt(e.target.value))
                          }
                          className='text-sm'
                        />
                      </div>
                      <div>
                        <Label className='text-xs'>Comisión</Label>
                        <Input
                          type='text'
                          inputMode='numeric'
                          value={detalle.comision ? formatNumberInput(detalle.comision) : ''}
                          onChange={e =>
                            handleUpdateDetalle(index, 'comision', parseNumberInput(e.target.value))
                          }
                          className='text-sm'
                        />
                      </div>
                      <div className='flex items-end'>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          onClick={() => handleRemoveDetalle(index)}
                          disabled={detalles.length === 1}
                          className='text-red-600 hover:text-red-700'
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {}
              {detalles.length > 0 && (
                <div className='p-4 bg-blue-50 rounded-lg border border-blue-200'>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-center'>
                    <div>
                      <div className='text-sm text-blue-700'>Sub Total</div>
                      <div className='text-lg font-bold text-blue-800'>
                        {formatCurrencyNoDecimals(subTotal)}
                      </div>
                    </div>
                    <div>
                      <div className='text-sm text-blue-700'>Total Comisiones</div>
                      <div className='text-lg font-bold text-blue-800'>
                        {formatCurrencyNoDecimals(totalComision)}
                      </div>
                    </div>
                    <div>
                      <div className='text-sm text-blue-700'>Total General</div>
                      <div className='text-lg font-bold text-green-600'>
                        {formatCurrencyNoDecimals(total)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {}
          <div className='flex-shrink-0 border-t px-6 py-4'>
            <div className='flex justify-center gap-2 w-full'>
              <Button
                type='button'
                onClick={handleClose}
                disabled={loading}
                variant='outline'
                size='sm'
                className='rounded-full px-6 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white'
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                disabled={loading || !codigo || !clienteId || detalles.length === 0}
                variant='outline'
                size='sm'
                className='rounded-full px-6 hover:scale-105 transition-all duration-200 bg-black text-white'
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
