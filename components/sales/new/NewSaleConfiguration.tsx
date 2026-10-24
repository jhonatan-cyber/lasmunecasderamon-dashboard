import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { CustomerSelect } from '@/components/shared/selects';
import { RoomSelect } from '@/components/shared/selects';
import { PaymentMethodSelect } from '@/components/shared/selects';
import { Input } from '@/components/ui/input';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { TipToggle } from '@/components/shared/TipToggle';

interface NewSaleConfigurationProps {
  clientes: any[];
  selectedCliente: string;
  setSelectedCliente: (val: string) => void;
  /** Segundo cliente con saldo para repartir el prepago (opcional). */
  selectedSegundoCliente: string;
  setSelectedSegundoCliente: (val: string) => void;
  clientesConSaldo: any[];
  requiresRoom: boolean;
  habitaciones: any[];
  selectedHabitacion: string;
  handleHabitacionChange: (id: string) => void;
  manualTime: string;
  setManualTime: (val: string) => void;
  metodoPago: string;
  setMetodoPago: (val: string) => void;
  propina: number;
  enableTip: boolean;
  setEnableTip: (val: boolean) => void;
}

const fieldWrapperClass = 'flex flex-col gap-1.5';
const fieldLabelClass =
  'block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-neutral-400';

export const NewSaleConfiguration = ({
  clientes,
  selectedCliente,
  setSelectedCliente,
  selectedSegundoCliente,
  setSelectedSegundoCliente,
  clientesConSaldo,
  requiresRoom,
  habitaciones,
  selectedHabitacion,
  handleHabitacionChange,
  manualTime,
  setManualTime,
  metodoPago,
  setMetodoPago,
  propina,
  enableTip,
  setEnableTip
}: NewSaleConfigurationProps) => {
  const propinaPct = Number(useConfigValue('facturacion', 'propina_venta', '10'));
  return (
    <div className='grid grid-cols-1 items-end gap-6 px-2 sm:grid-cols-2 lg:grid-cols-4'>
      <div className={fieldWrapperClass}>
        <CustomerSelect clientes={clientes} value={selectedCliente} onChange={setSelectedCliente} />
      </div>

      {requiresRoom && (
        <>
          <div className={fieldWrapperClass}>
            <RoomSelect
              habitaciones={habitaciones}
              value={selectedHabitacion}
              onChange={handleHabitacionChange}
            />
          </div>
          {selectedHabitacion && selectedHabitacion !== 'none' && (
            <div className={fieldWrapperClass}>
              <Label htmlFor='sale-room-minutes' className={fieldLabelClass}>
                Tiempo (minutos)
              </Label>
              <Input
                id='sale-room-minutes'
                type='number'
                min={1}
                step={1}
                inputMode='numeric'
                value={manualTime}
                onChange={event => setManualTime(event.target.value)}
                placeholder='Escribe los minutos'
                className='rounded-full'
              />
            </div>
          )}
        </>
      )}

      <div className={fieldWrapperClass}>
        <PaymentMethodSelect
          value={metodoPago}
          onChange={setMetodoPago}
          clientes={clientes}
          selectedClienteId={selectedCliente}
          selectedClienteIds={[selectedCliente, selectedSegundoCliente].filter(
            id => id && id !== 'none'
          )}
        />
      </div>

      {clientesConSaldo.length > 0 && (
        <div className='flex flex-col gap-1.5 sm:col-span-2 lg:col-span-4'>
          <div className='flex items-end gap-2'>
            <div className='flex-1'>
              <CustomerSelect
                clientes={clientesConSaldo}
                value={selectedSegundoCliente}
                onChange={setSelectedSegundoCliente}
                label='Segundo cliente (opcional, solo para repartir prepago)'
                placeholder='Sin segundo cliente'
              />
            </div>
            {selectedSegundoCliente !== 'none' && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-11 rounded-full px-4 text-xs'
                onClick={() => setSelectedSegundoCliente('none')}
              >
                <X className='mr-1 h-3.5 w-3.5' />
                Quitar
              </Button>
            )}
          </div>
          {metodoPago === 'prepago' && selectedSegundoCliente !== 'none' && (
            <p className='text-[11px] text-gray-500 dark:text-neutral-400'>
              El prepago se reparte mitad y mitad entre los dos clientes y cada uno recibe su
              comprobante.
            </p>
          )}
        </div>
      )}
      <div className={fieldWrapperClass}>
        <Label className={fieldLabelClass}>Propina Sugerida ({propinaPct}%)</Label>
        <TipToggle amount={propina} enabled={enableTip} onToggle={setEnableTip} showCheckbox />
      </div>
    </div>
  );
};
