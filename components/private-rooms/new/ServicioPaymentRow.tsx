'use client';

import { memo } from 'react';
import { Coins, DollarSign } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { PaymentMethodSelect } from '@/components/shared/selects';
import type { PaymentMethod } from '@/components/shared/selects/PaymentMethodSelect';
import {
  formatNumberWithSeparators,
  parseMonto,
  type ServicioFormData
} from '@/components/private-rooms/new/servicioFormModel';

const inputClass =
  'w-full bg-gray-100 dark:bg-slate-900/50 py-1 pl-9 text-sm sm:text-base border border-gray-300 dark:border-gray-700 rounded-full h-[40px] focus:outline-hidden focus:border-black';

/** Fila de montos: precio de servicio, método de pago e impuesto IVA. */
export const ServicioPaymentRow = memo(function ServicioPaymentRow({
  formData,
  setFormData,
  setPagosMixtos,
  isServicePriceLocked,
  disabledPaymentMethods,
  clientes,
  selectedClientData
}: {
  formData: ServicioFormData;
  setFormData: React.Dispatch<React.SetStateAction<ServicioFormData>>;
  setPagosMixtos: React.Dispatch<React.SetStateAction<any[]>>;
  isServicePriceLocked: boolean;
  disabledPaymentMethods: readonly PaymentMethod[];
  clientes: any[];
  selectedClientData: any;
}) {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4'>
      {/* Precio de servicio */}
      <div>
        <Label className='block text-xs font-medium text-gray-500 mb-1 uppercase'>
          PRECIO DE SERVICIO
        </Label>
        <div className='relative'>
          <span className='absolute inset-y-0 left-3 flex items-center text-gray-400'>
            <DollarSign className='w-4 h-4' />
          </span>
          <input
            type='text'
            value={
              formData.precio_servicio === 0
                ? ''
                : formatNumberWithSeparators(formData.precio_servicio)
            }
            onBlur={e => {
              if (e.target.value === '') {
                setFormData(prev => ({ ...prev, precio_servicio: 0 }));
              }
            }}
            onChange={e => {
              setFormData(prev => ({ ...prev, precio_servicio: parseMonto(e.target.value) }));
            }}
            className={inputClass}
            placeholder='0'
            disabled={isServicePriceLocked}
            readOnly={isServicePriceLocked}
          />
        </div>
      </div>

      {/* Método de pago */}
      <div>
        <PaymentMethodSelect
          value={formData.metodo_pago}
          onChange={value => {
            setFormData(prev => ({ ...prev, metodo_pago: value }));
            // Al cambiar de método se recomponen los pagos mixtos desde cero.
            setPagosMixtos([]);
          }}
          label='MÉTODO DE PAGO'
          placeholder='Seleccionar método de pago'
          required={true}
          className='w-full'
          showPrepago={!!selectedClientData}
          showMixto={true}
          disabledMethods={[...disabledPaymentMethods]}
          clientes={clientes}
          selectedClienteId={formData.clientes[0] || ''}
        />
      </div>

      {/* IVA */}
      <div>
        <Label className='block text-xs font-medium text-gray-500 mb-1 uppercase'>
          IMPUESTO IVA (20%)
        </Label>
        <div className='relative'>
          <span className='absolute inset-y-0 left-3 flex items-center text-gray-400'>
            <Coins className='w-4 h-4' />
          </span>
          <input
            type='text'
            value={formData.iva === 0 ? '' : formatNumberWithSeparators(formData.iva)}
            onChange={e => {
              if (formData.metodo_pago === 'tarjeta') {
                setFormData(prev => ({ ...prev, iva: parseMonto(e.target.value) }));
              }
            }}
            className={inputClass}
            placeholder='0'
            disabled={formData.metodo_pago !== 'tarjeta'}
          />
        </div>
      </div>
    </div>
  );
});
