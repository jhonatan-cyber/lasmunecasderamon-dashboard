'use client';

import * as React from 'react';

import { cn } from '@/lib/utils/utils';
import { FIELD_INPUT_CLASS } from '@/lib/ui/fieldStyles';

const isNumericInput = (type?: string, inputMode?: string) =>
  type === 'number' || inputMode === 'numeric';

// React ignora las asignaciones directas de `value` sobre inputs controlados
// (las anula su value tracker). Escribimos con el setter nativo y disparamos
// `input` para que React detecte el cambio y ejecute el `onChange` del consumidor.
const setNativeInputValue = (element: HTMLInputElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
};

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, inputMode, onFocus, onBlur, ...props }, ref) => {
    const clearedZero = React.useRef(false);

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      const element = event.currentTarget;
      if (isNumericInput(type, inputMode) && element.value === '0') {
        clearedZero.current = true;
        setNativeInputValue(element, '');
      }
      onFocus?.(event);
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      const element = event.currentTarget;
      if (clearedZero.current && element.value.trim() === '') {
        setNativeInputValue(element, '0');
      }
      clearedZero.current = false;
      onBlur?.(event);
    };

    return (
      <input
        type={type}
        inputMode={inputMode}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          ['checkbox', 'radio', 'file', 'hidden', 'range', 'color'].includes(type || '')
            ? className
            : cn(
                FIELD_INPUT_CLASS,
                'flex file:border-0 file:bg-transparent file:text-sm file:font-medium',
                className,
                'rounded-full'
              )
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
