import React from 'react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CreditCard, DollarSign, Building2 } from 'lucide-react';
import { metodoPagoLabels } from '@/lib/salesUtils';

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';

interface PaymentMethodSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

const PaymentMethodSelect: React.FC<PaymentMethodSelectProps> = ({
  value,
  onChange,
  label = 'Método de pago',
  placeholder = 'Seleccionar método de pago',
  className = '',
  required = false,
  disabled = false
}) => {
  const paymentMethods = [
    { value: 'efectivo', label: metodoPagoLabels.efectivo, icon: DollarSign },
    { value: 'tarjeta', label: metodoPagoLabels.tarjeta, icon: CreditCard },
    { value: 'transferencia', label: metodoPagoLabels.transferencia, icon: Building2 }
  ];

  const getPaymentMethodLabel = (value: string) => {
    const method = paymentMethods.find(m => m.value === value);
    return method ? method.label : value;
  };

  const getPaymentMethodIcon = (value: string) => {
    const method = paymentMethods.find(m => m.value === value);
    return method ? method.icon : CreditCard;
  };

  const SelectedIcon = getPaymentMethodIcon(value);

  const handleValueChange = (newValue: string) => {
    onChange(newValue);
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <Label className='block text-xs font-medium text-gray-500 mb-1'>
        {label}
        {required && <span className='text-red-500'>*</span>}
      </Label>

      <div className='relative'>
        <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10'>
          <SelectedIcon className='w-4 h-4' />
        </span>
        <Select value={value} onValueChange={handleValueChange} disabled={disabled}>
          <SelectTrigger 
            className='w-full pl-10 rounded-full' 
            disabled={disabled}
            onClick={(e) => e.stopPropagation()}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent onClick={(e) => e.stopPropagation()}>
            {paymentMethods.map(method => (
              <SelectItem 
                key={method.value} 
                value={method.value}
                onClick={(e) => e.stopPropagation()}
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
