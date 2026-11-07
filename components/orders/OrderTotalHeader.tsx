'use client';

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { TipToggle } from '@/components/shared/TipToggle';
import { CheckoutSummary } from '@/components/shared/CheckoutSummary';

interface OrderTotalHeaderProps {
  total: number;
  subtotal?: number;
  onSubmit?: () => void;
  onTipChange?: (enabled: boolean, percentage: number) => void;
  tipPercentage?: number;
  tipEnabled?: boolean;
  disabled?: boolean;
}

const OrderTotalHeader: React.FC<OrderTotalHeaderProps> = ({
  total,
  subtotal,
  onSubmit,
  onTipChange,
  tipPercentage: initialTipPercentage = 10,
  disabled = false,
  tipEnabled: initialTipEnabled = false
}) => {
  const [tipEnabled, setTipEnabled] = useState(initialTipEnabled);
  const [tipPercentage] = useState(initialTipPercentage);

  const tipAmount = tipEnabled && subtotal ? (subtotal * tipPercentage) / 100 : 0;

  const handleTipToggle = (nextEnabled: boolean) => {
    setTipEnabled(nextEnabled);
    if (onTipChange) {
      onTipChange(nextEnabled, tipPercentage);
    }
  };

  return (
    <CheckoutSummary
      title='Resumen del pedido'
      actionLabel='Generar pedido'
      subtotal={subtotal ?? total - tipAmount}
      propina={tipAmount}
      total={total}
      onSubmit={onSubmit}
      disabled={disabled}
      tipControl={
        <div className='space-y-1'>
          <Label className='block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400'>
            Propina sugerida ({tipPercentage}%)
          </Label>
          <TipToggle amount={tipAmount} enabled={tipEnabled} onToggle={handleTipToggle} />
        </div>
      }
    />
  );
};

export default OrderTotalHeader;
