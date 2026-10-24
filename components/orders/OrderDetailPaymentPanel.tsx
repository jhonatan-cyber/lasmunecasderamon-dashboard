'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { PaymentMethodSelect } from '@/components/shared/selects';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { ORDER_FIELD_INPUT_CLASS, ORDER_FIELD_LABEL_CLASS } from './orderFieldStyles';

interface OrderDetailPaymentPanelProps {
  metodoPago: string;
  setMetodoPago: (value: string) => void;
  habitacionesActivas: any[];
  habitacionId: string;
  tiempoHabitacion: number;
  setTiempoHabitacion: (value: number) => void;
  propina: number;
  propinaOriginal: number;
  propinaPct: number;
  agregarPropina: boolean;
  setAgregarPropina: (value: boolean) => void;
  clienteId: string;
  clienteSaldo: number | null;
  totalFinal: number;
  orderTotalCommission: number;
}

export function OrderDetailPaymentPanel({
  metodoPago,
  setMetodoPago,
  habitacionesActivas,
  habitacionId,
  tiempoHabitacion,
  setTiempoHabitacion,
  propina,
  propinaOriginal,
  propinaPct,
  agregarPropina,
  setAgregarPropina,
  clienteId,
  clienteSaldo,
  totalFinal,
  orderTotalCommission
}: OrderDetailPaymentPanelProps) {
  const room = habitacionesActivas.find(r => String(r.id_habitacion ?? r.id) === habitacionId);
  const tieneSaldoPrepago = Boolean(clienteId) && Number(clienteSaldo || 0) > 0;
  const prepagoParcial = tieneSaldoPrepago && Number(clienteSaldo) < totalFinal;
  const prepagoSinSaldo = metodoPago === 'prepago' && !tieneSaldoPrepago;
  return (
    <div className='space-y-4'>
      <p className='text-xs text-muted-foreground'>
        Productos y comisiones son los del pedido. El método de pago y la propina los eliges tú al
        cobrar.
      </p>
      <PaymentMethodSelect
        value={metodoPago}
        onChange={setMetodoPago}
        required
        showPrepago={Boolean(clienteId)}
        clientes={tieneSaldoPrepago ? [{ id: clienteId, saldo: Number(clienteSaldo) }] : []}
        selectedClienteId={clienteId}
      />
      {prepagoParcial && (
        <div className='rounded-xl border border-dashed p-3 text-sm'>
          <p className='mb-2 font-black uppercase tracking-wide'>Pago mixto</p>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Prepago:</span>
            <span className='font-black text-emerald-600'>
              -{formatCurrencyCLP(Number(clienteSaldo))}
            </span>
          </div>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Restante:</span>
            <span className='font-black'>
              {formatCurrencyCLP(totalFinal - Number(clienteSaldo))}
            </span>
          </div>
        </div>
      )}
      {prepagoSinSaldo && (
        <div role='alert' className='text-xs text-red-500'>
          El cliente del pedido no tiene saldo prepago disponible. Elige otro método de pago.
        </div>
      )}
      {habitacionId && (
        <>
          <div>
            <Label htmlFor='order-room' className={ORDER_FIELD_LABEL_CLASS}>
              Habitación
            </Label>
            <Input
              id='order-room'
              className={ORDER_FIELD_INPUT_CLASS}
              value={room?.name || room?.nombre || habitacionId}
              readOnly
            />
          </div>
          <div>
            <Label htmlFor='tiempo-habitacion' className={ORDER_FIELD_LABEL_CLASS}>
              Tiempo de uso (minutos)
            </Label>
            <Input
              id='tiempo-habitacion'
              className={ORDER_FIELD_INPUT_CLASS}
              type='number'
              min={1}
              max={1440}
              step={1}
              value={tiempoHabitacion}
              onChange={e => setTiempoHabitacion(Number(e.target.value))}
            />
          </div>
        </>
      )}
      <div>
        {propinaOriginal > 0 ? (
          <>
            <Label htmlFor='propina-display' className={ORDER_FIELD_LABEL_CLASS}>
              Propina incluida (la eligió el garzón)
            </Label>
            <Input
              id='propina-display'
              className={ORDER_FIELD_INPUT_CLASS}
              value={formatCurrencyCLP(propina)}
              readOnly
            />
          </>
        ) : (
          <>
            <Label htmlFor='propina-checkbox' className={ORDER_FIELD_LABEL_CLASS}>
              Propina ({propinaPct}%)
            </Label>
            <div className='flex items-center gap-3 py-2'>
              <Checkbox
                id='propina-checkbox'
                checked={agregarPropina}
                onCheckedChange={checked => setAgregarPropina(checked === true)}
              />
              <label
                htmlFor='propina-checkbox'
                className='text-sm text-gray-700 cursor-pointer select-none dark:text-zinc-300'
              >
                Agregar propina del {propinaPct}%
                {agregarPropina && (
                  <span className='ml-2 font-semibold text-blue-600 dark:text-blue-400'>
                    ({formatCurrencyCLP(propina)})
                  </span>
                )}
              </label>
            </div>
          </>
        )}
      </div>
      <div>
        <Label htmlFor='order-total-comision' className={ORDER_FIELD_LABEL_CLASS}>
          Total Comisión
        </Label>
        <Input
          id='order-total-comision'
          className={ORDER_FIELD_INPUT_CLASS}
          value={formatCurrencyCLP(orderTotalCommission)}
          readOnly
        />
      </div>
      <Separator />
    </div>
  );
}
