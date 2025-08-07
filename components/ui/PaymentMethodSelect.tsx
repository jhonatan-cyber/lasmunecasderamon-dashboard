import React from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCreditCard } from "@fortawesome/free-solid-svg-icons";
import { metodoPagoLabels } from "@/lib/salesUtils";

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
  label = "Método de pago",
  placeholder = "Seleccionar método de pago",
  className = "",
  required = false,
  disabled = false,
}) => {
  const paymentMethods = [
    { value: 'efectivo', label: metodoPagoLabels.efectivo, icon: '💵' },
    { value: 'tarjeta', label: metodoPagoLabels.tarjeta, icon: '💳' },
    { value: 'transferencia', label: metodoPagoLabels.transferencia, icon: '🏦' },
  ];

  const getPaymentMethodLabel = (value: string) => {
    const method = paymentMethods.find(m => m.value === value);
    return method ? `${method.icon} ${method.label}` : value;
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <Label className="block text-xs font-medium text-gray-500 mb-1">
        <FontAwesomeIcon icon={faCreditCard} />
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full rounded-full" disabled={disabled}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {paymentMethods.map((method) => (
            <SelectItem key={method.value} value={method.value}>
              {method.icon} {method.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default PaymentMethodSelect; 