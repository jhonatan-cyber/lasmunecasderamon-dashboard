import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { CustomerSelect } from '@/components/shared/selects';
import { RoomSelect } from '@/components/shared/selects';
import { PaymentMethodSelect } from '@/components/shared/selects';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { BaucherFileInput } from '@/components/shared/BaucherFileInput';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { TipToggle } from '@/components/shared/TipToggle';

const TIEMPOS_VENTA = [10, 15, 20, 25, 30] as const;

interface NewSaleConfigurationProps {
  clientes: any[];
  selectedCliente: string;
  setSelectedCliente: (val: string) => void;
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
  baucherFoto: string | null;
  setBaucherFoto: (val: string | null) => void;
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
  baucherFoto,
  setBaucherFoto,
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
              <Select value={manualTime} onValueChange={setManualTime}>
                <SelectTrigger id='sale-room-minutes' className='rounded-full'>
                  <SelectValue placeholder='Selecciona el tiempo' />
                </SelectTrigger>
                <SelectContent>
                  {TIEMPOS_VENTA.map(minutos => (
                    <SelectItem key={minutos} value={String(minutos)}>
                      {minutos} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {metodoPago === 'transferencia' && (
        <div className='sm:col-span-2 lg:col-span-4'>
          <BaucherFileInput
            id='sale-baucher'
            value={baucherFoto}
            onChange={setBaucherFoto}
            label='Foto del baucher (transferencia)'
            hint='Adjunta la captura o foto del comprobante de la transferencia.'
          />
        </div>
      )}

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
