'use client';

import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
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
  setBaucherFoto
}: NewSaleConfigurationProps) => {
  const [mostrarSegundoCliente, setMostrarSegundoCliente] = useState(
    selectedSegundoCliente !== 'none'
  );

  useEffect(() => {
    if (metodoPago !== 'prepago') {
      setMostrarSegundoCliente(false);
      if (selectedSegundoCliente !== 'none') setSelectedSegundoCliente('none');
      return;
    }
    if (selectedSegundoCliente !== 'none') setMostrarSegundoCliente(true);
  }, [metodoPago, selectedSegundoCliente, setSelectedSegundoCliente]);

  return (
    <div className='grid min-w-0 grid-cols-1 items-start gap-4 px-2'>
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
        <div className='min-w-0'>
          <BaucherFileInput
            id='sale-baucher'
            value={baucherFoto}
            onChange={setBaucherFoto}
            label='Foto del baucher (transferencia)'
            hint='Adjunta la captura o foto del comprobante de la transferencia.'
          />
        </div>
      )}

      {metodoPago === 'prepago' && clientesConSaldo.length > 0 && (
        <div className='flex min-w-0 flex-col gap-1.5'>
          <div className='flex items-center gap-2'>
            <Checkbox
              id='split-prepaid-sale'
              checked={mostrarSegundoCliente}
              onCheckedChange={checked => {
                const enabled = checked === true;
                setMostrarSegundoCliente(enabled);
                if (!enabled) setSelectedSegundoCliente('none');
              }}
            />
            <Label
              htmlFor='split-prepaid-sale'
              className='cursor-pointer text-sm font-medium text-gray-700 dark:text-neutral-300'
            >
              Repartir prepago con otro cliente
            </Label>
          </div>
          {mostrarSegundoCliente && (
            <div className='flex items-end gap-2'>
              <div className='flex-1'>
                <CustomerSelect
                  clientes={clientesConSaldo}
                  value={selectedSegundoCliente}
                  onChange={setSelectedSegundoCliente}
                  label='Segundo cliente'
                  placeholder='Selecciona otro cliente'
                />
              </div>
              {selectedSegundoCliente !== 'none' && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-11 rounded-full px-4 text-xs'
                  onClick={() => {
                    setSelectedSegundoCliente('none');
                    setMostrarSegundoCliente(false);
                  }}
                >
                  <X className='mr-1 h-3.5 w-3.5' />
                  Quitar
                </Button>
              )}
            </div>
          )}
          {mostrarSegundoCliente && selectedSegundoCliente !== 'none' && (
            <p className='text-[11px] text-gray-500 dark:text-neutral-400'>
              El prepago se reparte mitad y mitad entre los dos clientes y cada uno recibe su
              comprobante.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
