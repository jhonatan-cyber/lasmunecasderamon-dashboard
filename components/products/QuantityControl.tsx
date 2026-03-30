import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';

interface QuantityControlProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export const QuantityControl = React.memo<QuantityControlProps>(({
  value,
  onChange,
  min = 1,
  max = 999,
  size = 'sm',
  disabled = false
}) => {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const buttonSize = size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-8 h-8' : 'w-10 h-10';
  const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5';
  const textSize = size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg';

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleDecrement}
        className={`${buttonSize} p-0 rounded-full`}
        disabled={disabled || value <= min}
      >
        <Minus className={iconSize} />
      </Button>
      <span className={`w-8 text-center ${textSize} font-medium`}>
        {value}
      </span>
      <Button
        size="sm"
        variant="outline"
        onClick={handleIncrement}
        className={`${buttonSize} p-0 rounded-full`}
        disabled={disabled || value >= max}
      >
        <Plus className={iconSize} />
      </Button>
    </div>
  );
});

QuantityControl.displayName = 'QuantityControl';
