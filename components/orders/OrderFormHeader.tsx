'use client';

import { CustomerSelect, PaymentMethodSelect } from '@/components/shared/selects';
import OrderTotalHeader from '@/components/orders/OrderTotalHeader';

interface OrderFormHeaderProps {
  metodoPago: string;
  onMetodoPagoChange: (value: string) => void;
  clientes: Array<{ id_cliente?: string | number; id?: string | number }>;
  selectedCliente: string;
  onClienteChange: (v: string) => void;
  total: number;
  subtotal: number;
  tipPercentage: number;
  tipEnabled: boolean;
  onSubmit: () => void;
  onTipChange: (enabled: boolean, percentage: number) => void;
}

export default function OrderFormHeader({
  clientes,
  selectedCliente,
  onClienteChange,
  total,
  subtotal,
  tipPercentage,
  tipEnabled,
  onSubmit,
  onTipChange,
  metodoPago,
  onMetodoPagoChange,
}: OrderFormHeaderProps) {
  return (
    <div className='mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start'>
      <div className='flex-1 space-y-4'>
        <CustomerSelect
          clientes={clientes}
          value={selectedCliente}
          onChange={onClienteChange}
          label='Cliente (Opcional)'
          placeholder='Sin cliente seleccionado'
          required={false}
          className='w-full'
        />
        <PaymentMethodSelect
          value={metodoPago}
          onChange={onMetodoPagoChange}
          required
          showPrepago={false}
          showMixto={false}
        />
      </div>

      <OrderTotalHeader
        total={total}
        subtotal={subtotal}
        onSubmit={onSubmit}
        tipPercentage={tipPercentage}
        tipEnabled={tipEnabled}
        onTipChange={onTipChange}
      />
    </div>
  );
}
