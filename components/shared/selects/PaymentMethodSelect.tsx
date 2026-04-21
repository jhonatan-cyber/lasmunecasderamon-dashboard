import React from 'react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CreditCard, DollarSign, Building2, Wallet, Split } from 'lucide-react';
import { metodoPagoLabels } from '@/lib/business/salesUtils';
import {
  ORDER_FIELD_LABEL_CLASS,
  ORDER_FIELD_POPOVER_CLASS,
  ORDER_FIELD_TRIGGER_CLASS
} from '@/components/orders/orderFieldStyles';

export type PaymentMethod =
  | 'efectivo'
  | 'tarjeta'
  | 'transferencia'
  | 'prepago'
  | 'mixto';

interface PaymentMethodSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  showPrepago?: boolean;
  showMixto?: boolean;
  disabledMethods?: PaymentMethod[];
}

const BASE_PAYMENT_METHODS: Array<{
  value: PaymentMethod;
  label: string;
}> = [
  { value: 'efectivo', label: metodoPagoLabels.efectivo },
  { value: 'tarjeta', label: metodoPagoLabels.tarjeta },
  { value: 'transferencia', label: metodoPagoLabels.transferencia }
];

const PaymentMethodSelect: React.FC<PaymentMethodSelectProps> = ({
  value,
  onChange,
  label = 'Metodo de pago',
  placeholder = 'Seleccionar metodo de pago',
  className = '',
  required = false,
  disabled = false,
  showPrepago = true,
  showMixto = false,
  disabledMethods = []
}) => {
  const paymentMethods = [
    ...BASE_PAYMENT_METHODS,
    ...(showPrepago ? [{ value: 'prepago' as const, label: metodoPagoLabels.prepago }] : []),
    ...(showMixto ? [{ value: 'mixto' as const, label: metodoPagoLabels.mixto }] : [])
  ];

  const renderIcon = (methodValue: string) => {
    switch (methodValue) {
      case 'efectivo':
        return <DollarSign className='w-4 h-4' />;
      case 'tarjeta':
        return <CreditCard className='w-4 h-4' />;
      case 'transferencia':
        return <Building2 className='w-4 h-4' />;
      case 'prepago':
        return <Wallet className='w-4 h-4' />;
      case 'mixto':
        return <Split className='w-4 h-4' />;
      default:
        return <CreditCard className='w-4 h-4' />;
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <Label className={ORDER_FIELD_LABEL_CLASS}>
        {label}
        {required && <span className='text-red-500'>*</span>}
      </Label>

      <div className='relative'>
        <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10'>
          {renderIcon(value)}
        </span>
        <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger
            className={`${ORDER_FIELD_TRIGGER_CLASS} pl-10`}
            disabled={disabled}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className={ORDER_FIELD_POPOVER_CLASS}>
            {paymentMethods.map(method => (
              <SelectItem
                key={method.value}
                value={method.value}
                disabled={disabledMethods.includes(method.value)}
                className='text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              >
                {method.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default PaymentMethodSelect;
