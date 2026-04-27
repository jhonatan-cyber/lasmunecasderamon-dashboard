import React, { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CreditCard, DollarSign, Building2, Wallet, Split, Search } from 'lucide-react';
import { metodoPagoLabels } from '@/lib/business/salesUtils';
import {
  ORDER_FIELD_LABEL_CLASS,
  ORDER_FIELD_POPOVER_CLASS,
  ORDER_FIELD_SEARCH_INPUT_CLASS,
  ORDER_FIELD_SEARCH_WRAPPER_CLASS,
  ORDER_MULTISELECT_TRIGGER_CLASS
} from '@/components/orders/orderFieldStyles';

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'prepago' | 'mixto';

interface PaymentMethodInfo {
  value: PaymentMethod;
  label: string;
  icon: React.ReactNode;
}

interface Customer {
  id_cliente?: string | number;
  id?: string | number;
  nombre?: string;
  name?: string;
  saldo?: number;
  saldo_prepago?: number;
}

interface PaymentMethodSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  showPrepago?: boolean;
  showMixto?: boolean;
  disabledMethods?: PaymentMethod[];
  clientes?: Customer[];
  selectedClienteId?: string;
}

const BASE_PAYMENT_METHODS: PaymentMethodInfo[] = [
  { value: 'efectivo', label: metodoPagoLabels.efectivo, icon: <DollarSign className='w-4 h-4' /> },
  { value: 'tarjeta', label: metodoPagoLabels.tarjeta, icon: <CreditCard className='w-4 h-4' /> },
  {
    value: 'transferencia',
    label: metodoPagoLabels.transferencia,
    icon: <Building2 className='w-4 h-4' />
  }
];

const PaymentMethodSelect: React.FC<PaymentMethodSelectProps> = ({
  value,
  onChange,
  label = 'Método de pago',
  placeholder = 'Seleccione un método de pago',
  searchPlaceholder = 'Buscar método de pago...',
  className = '',
  required = false,
  disabled = false,
  showPrepago = true,
  showMixto = false,
  disabledMethods = [],
  clientes = [],
  selectedClienteId
}) => {
  const selectedCustomer = useMemo(() => {
    if (!selectedClienteId || !clientes.length) return null;
    return clientes.find(
      c => c.id_cliente?.toString() === selectedClienteId || c.id?.toString() === selectedClienteId
    );
  }, [clientes, selectedClienteId]);

  const customerSaldo = selectedCustomer?.saldo ?? selectedCustomer?.saldo_prepago ?? 0;
  const canUsePrepago = customerSaldo > 0;
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const uniqueId = React.useId();

  const paymentMethods = useMemo(() => {
    const methods = [...BASE_PAYMENT_METHODS];
    // Solo mostrar prepago si el cliente tiene saldo > 0
    if (showPrepago && canUsePrepago) {
      methods.push({
        value: 'prepago',
        label: `${metodoPagoLabels.prepago} ($${customerSaldo.toLocaleString('es-CL')})`,
        icon: <Wallet className='w-4 h-4' />
      });
    }
    if (showMixto) {
      methods.push({
        value: 'mixto',
        label: metodoPagoLabels.mixto,
        icon: <Split className='w-4 h-4' />
      });
    }
    return methods.filter(method => !disabledMethods.includes(method.value));
  }, [showPrepago, showMixto, disabledMethods, canUsePrepago, customerSaldo]);

  const filteredMethods = useMemo(() => {
    if (!searchTerm) return paymentMethods;
    const searchLower = searchTerm.toLowerCase();
    return paymentMethods.filter(
      method =>
        method.label.toLowerCase().includes(searchLower) ||
        method.value.toLowerCase().includes(searchLower)
    );
  }, [paymentMethods, searchTerm]);

  const selectedMethod = paymentMethods.find(method => method.value === value);

  const handleValueChange = (newValue: string) => {
    setSearchTerm('');
    setOpen(false);
    onChange(newValue);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setSearchTerm(e.target.value);
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <Label htmlFor={uniqueId} className={ORDER_FIELD_LABEL_CLASS}>
        {label}
        {required && <span className='ml-1 text-red-500'>*</span>}
      </Label>

      <div className='relative'>
        <Popover open={open} onOpenChange={nextOpen => !disabled && setOpen(nextOpen)}>
          <PopoverTrigger asChild>
            <button
              id={uniqueId}
              type='button'
              className={`${ORDER_MULTISELECT_TRIGGER_CLASS} flex items-center gap-2 pr-10`}
              onClick={() => !disabled && setOpen(!open)}
              disabled={disabled}
            >
              {selectedMethod ? (
                <>
                  <span className='text-gray-400 shrink-0'>{selectedMethod.icon}</span>
                  <span className='truncate text-sm text-gray-900 dark:text-white'>
                    {selectedMethod.label}
                  </span>
                </>
              ) : (
                <>
                  <CreditCard className='w-4 h-4 text-gray-400 shrink-0' />
                  <span className='text-sm text-gray-400 truncate'>{placeholder}</span>
                </>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align='start' className={ORDER_FIELD_POPOVER_CLASS} sideOffset={5}>
            <div className={ORDER_FIELD_SEARCH_WRAPPER_CLASS}>
              <label htmlFor={`${uniqueId}-search`} className='sr-only'>
                Buscar método de pago
              </label>
              <Input
                id={`${uniqueId}-search`}
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={e => {
                  if (e.key === ' ') {
                    e.stopPropagation();
                  }
                }}
                className={ORDER_FIELD_SEARCH_INPUT_CLASS}
                disabled={disabled}
                onClick={e => e.stopPropagation()}
              />
            </div>

            <div className='max-h-60 overflow-y-auto p-1'>
              {filteredMethods.length === 0 ? (
                <div className='p-4 text-center text-sm text-gray-500'>
                  {searchTerm ? 'No se encontraron métodos de pago' : 'No hay métodos disponibles'}
                </div>
              ) : (
                filteredMethods.map(method => {
                  const isSelected = method.value === value;

                  return (
                    <button
                      key={method.value}
                      type='button'
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 ${isSelected ? 'bg-gray-100' : ''}`}
                      onClick={() => handleValueChange(method.value)}
                      disabled={disabled}
                    >
                      <span className='flex items-center gap-2 text-gray-700'>
                        <span className='text-gray-400'>{method.icon}</span>
                        {method.label}
                      </span>
                      {isSelected ? (
                        <span className='text-xs font-semibold text-gray-500'>SELECCIONADO</span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default PaymentMethodSelect;
