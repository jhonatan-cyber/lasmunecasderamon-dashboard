'use client';

import { Coins, DollarSign } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { PaymentMethodSelect } from '@/components/shared/selects';
import { RoomSelect } from '@/components/shared/selects';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import {
  ORDER_FIELD_INPUT_CLASS,
  ORDER_FIELD_INPUT_WITH_ICON_CLASS,
  ORDER_FIELD_LABEL_CLASS,
  ORDER_FIELD_POPOVER_CLASS,
  ORDER_FIELD_TRIGGER_CLASS
} from '@/components/orders/orderFieldStyles';

interface OrderDetailPaymentPanelProps {
  metodoPago: string;
  setMetodoPago: (value: string) => void;
  showMetodoPagoError: boolean;
  shouldShowRoomSelector: boolean;
  habitacionesActivas: any[];
  habitacionId: string;
  setHabitacionId: (value: string) => void;
  hasRoomSelectedInOrder: boolean;
  tiempoHabitacion: number;
  setTiempoHabitacion: (value: number) => void;
  propinaDisplayValue: string;
  agregarPropina: boolean;
  setAgregarPropina: (value: boolean) => void;
  propina: number;
  orderTotalCommission: number;
}

export function OrderDetailPaymentPanel({
  metodoPago,
  setMetodoPago,
  showMetodoPagoError,
  shouldShowRoomSelector,
  habitacionesActivas,
  habitacionId,
  setHabitacionId,
  hasRoomSelectedInOrder,
  tiempoHabitacion,
  setTiempoHabitacion,
  propinaDisplayValue,
  agregarPropina,
  setAgregarPropina,
  propina,
  orderTotalCommission
}: OrderDetailPaymentPanelProps) {
  return (
    <div className='space-y-4'>
      <div>
        <PaymentMethodSelect
          value={metodoPago}
          onChange={setMetodoPago}
          label='MÃ©todo de pago'
          placeholder='Seleccione un mÃ©todo de pago'
          required={true}
          className={showMetodoPagoError && !metodoPago ? 'border-red-300' : ''}
        />
        {showMetodoPagoError && !metodoPago && (
          <div className='text-xs text-red-500 mt-1'>âš ï¸ El mÃ©todo de pago es obligatorio</div>
        )}
      </div>

      {shouldShowRoomSelector && (
        <>
          <RoomSelect
            habitaciones={habitacionesActivas}
            value={habitacionId}
            onChange={setHabitacionId}
            label='HabitaciÃ³n (opcional)'
            placeholder='Seleccione una habitaciÃ³n'
            searchPlaceholder='Buscar habitaciÃ³n...'
            filterByStatus={1}
            includeRoomIds={habitacionId ? [habitacionId] : []}
            showTime={true}
            disabled={hasRoomSelectedInOrder}
            disabledReason={
              hasRoomSelectedInOrder
                ? 'Este pedido ya viene con una habitaciÃ³n seleccionada y no se puede cambiar.'
                : undefined
            }
          />

          {habitacionId && (
            <div>
              <Label className={ORDER_FIELD_LABEL_CLASS}>Tiempo de uso (minutos)</Label>
              <Select
                value={tiempoHabitacion.toString()}
                onValueChange={(val: string) => setTiempoHabitacion(Number(val))}
              >
                <SelectTrigger className={ORDER_FIELD_TRIGGER_CLASS}>
                  <SelectValue placeholder='Seleccionar tiempo' />
                </SelectTrigger>
                <SelectContent className={ORDER_FIELD_POPOVER_CLASS}>
                  {['5', '10', '15', '20', '25', '30'].map(minutes => (
                    <SelectItem
                      key={minutes}
                      value={minutes}
                      className='text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    >
                      {minutes} minutos
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}

      <div>
        <Label className={ORDER_FIELD_LABEL_CLASS}>Propina</Label>
        <div className='flex items-center space-x-2'>
          <div className='relative flex-1'>
            <Coins className='absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground' />
            <Input
              className={`${ORDER_FIELD_INPUT_CLASS} pl-8`}
              placeholder='Sin propina'
              type='text'
              value={propinaDisplayValue}
              readOnly
            />
          </div>
          <div className='flex items-center space-x-2'>
            <Checkbox
              id='agregar-propina'
              checked={agregarPropina}
              onCheckedChange={checked => setAgregarPropina(checked === true)}
            />
            <label
              htmlFor='agregar-propina'
              className='cursor-pointer whitespace-nowrap text-xs text-gray-700 dark:text-zinc-300'
            >
              10%
            </label>
          </div>
        </div>

        {agregarPropina && (
          <div className='text-xs text-green-600 mt-1'>
            âœ“ Propina calculada: {formatCurrencyCLP(propina)}
          </div>
        )}
      </div>

      <div>
        <Label className={ORDER_FIELD_LABEL_CLASS}>Total ComisiÃ³n</Label>
        <div className='relative'>
          <DollarSign className='absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground' />
          <Input
            className={`${ORDER_FIELD_INPUT_WITH_ICON_CLASS} font-semibold`}
            value={formatCurrencyCLP(orderTotalCommission)}
            disabled
          />
        </div>
      </div>

      <Separator />
    </div>
  );
}


