'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { ORDER_FIELD_INPUT_CLASS, ORDER_FIELD_LABEL_CLASS } from './orderFieldStyles';

interface OrderDetailPaymentPanelProps {
  metodoPago: string;
  habitacionesActivas: any[];
  habitacionId: string;
  tiempoHabitacion: number;
  setTiempoHabitacion: (value: number) => void;
  propina: number;
  orderTotalCommission: number;
}

export function OrderDetailPaymentPanel({
  metodoPago,
  habitacionesActivas,
  habitacionId,
  tiempoHabitacion,
  setTiempoHabitacion,
  propina,
  orderTotalCommission
}: OrderDetailPaymentPanelProps) {
  const room = habitacionesActivas.find(r => String(r.id_habitacion ?? r.id) === habitacionId);
  const paymentLabels: Record<string, string> = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia'
  };
  return (
    <div className='space-y-4'>
      <p className='text-xs text-muted-foreground'>
        Los datos del pedido son de solo lectura. Si tiene habitación, puedes ajustar el tiempo de
        uso.
      </p>
      <div>
        <Label htmlFor='order-payment' className={ORDER_FIELD_LABEL_CLASS}>
          Método de pago
        </Label>
        <Input
          id='order-payment'
          className={ORDER_FIELD_INPUT_CLASS}
          value={paymentLabels[metodoPago] || 'Sin registrar'}
          readOnly
        />
      </div>
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
        <Label htmlFor='propina-display' className={ORDER_FIELD_LABEL_CLASS}>
          Propina
        </Label>
        <Input
          id='propina-display'
          className={ORDER_FIELD_INPUT_CLASS}
          value={formatCurrencyCLP(propina)}
          readOnly
        />
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
