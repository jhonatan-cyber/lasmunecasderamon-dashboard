'use client';

import { CustomerSelect, PaymentMethodSelect } from '@/components/shared/selects';
import OrderTotalHeader from '@/components/orders/OrderTotalHeader';
import { BaucherFileInput } from '@/components/shared/BaucherFileInput';
import { PrepagoNotice } from '@/components/shared/PrepagoNotice';

interface OrderFormHeaderProps {
  metodoPago: string;
  onMetodoPagoChange: (value: string) => void;
  baucherFoto: string | null;
  onBaucherChange: (dataUrl: string | null) => void;
  clientes: Array<{ id_cliente?: string | number; id?: string | number }>;
  selectedCliente: string;
  onClienteChange: (v: string) => void;
  clienteSaldo?: number;
  total: number;
  subtotal: number;
  tipPercentage: number;
  tipEnabled: boolean;
  onSubmit: () => void;
  submitDisabled?: boolean;
  onTipChange: (enabled: boolean, percentage: number) => void;
}

export default function OrderFormHeader({
  clientes,
  selectedCliente,
  onClienteChange,
  clienteSaldo = 0,
  total,
  subtotal,
  tipPercentage,
  tipEnabled,
  onSubmit,
  submitDisabled = false,
  onTipChange,
  metodoPago,
  onMetodoPagoChange,
  baucherFoto,
  onBaucherChange
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
        {metodoPago === 'transferencia' && (
          <div className='rounded-xl border border-dashed border-amber-400/70 bg-amber-50/70 p-3 dark:border-amber-500/30 dark:bg-amber-500/10'>
            <BaucherFileInput
              id='pedido-baucher'
              label='Foto del baucher (obligatoria)'
              hint='Es la constancia del pago: sin la foto no se genera el pedido.'
              value={baucherFoto}
              onChange={onBaucherChange}
            />
          </div>
        )}
        <PrepagoNotice saldo={clienteSaldo} total={total} diferido />
      </div>

      <OrderTotalHeader
        total={total}
        subtotal={subtotal}
        onSubmit={onSubmit}
        disabled={submitDisabled}
        tipPercentage={tipPercentage}
        tipEnabled={tipEnabled}
        onTipChange={onTipChange}
      />
    </div>
  );
}
