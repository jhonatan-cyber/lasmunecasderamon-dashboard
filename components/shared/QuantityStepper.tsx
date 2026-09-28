'use client';

import { Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface QuantityStepperProps {
  /** Unidades elegidas para esta presentación. */
  value: number;
  /** Tope de la forma de venta: stock en bar para la botella, 99 para el shot. */
  max: number;
  /** Recibe la cantidad siguiente; quien lo usa la guarda en su propio estado. */
  onChange: (next: number) => void;
  /** Línea informativa bajo el contador ('máx. 5', 'Disponibles en bar: 5'). */
  children?: React.ReactNode;
}

/**
 * Selector de cantidad de una presentación del bar. Lo comparten el buscador
 * rápido y el modal de categoría, que antes repetían el mismo markup.
 *
 * En el tope el botón de aumentar no se deshabilita: queda apagado pero
 * clickeable y avisa con un toast, porque un botón mudo deja al cajero sin
 * saber por qué no sube. El de disminuir sí se deshabilita en una unidad, donde
 * el límite se explica solo.
 */
export function QuantityStepper({ value, max, onChange, children }: QuantityStepperProps) {
  const enTope = value >= max;
  return (
    <div className='flex flex-col items-center gap-0.5'>
      <div className='flex items-center justify-center gap-1.5'>
        <Button
          size='sm'
          variant='outline'
          aria-label='Disminuir'
          onClick={() => {
            if (value > 1) onChange(value - 1);
          }}
          className='h-7 w-7 rounded-full p-0 transition-all duration-200 hover:scale-105'
          disabled={value <= 1}
        >
          <Minus className='h-3 w-3' />
        </Button>
        <span className='w-7 text-center text-sm font-bold tabular-nums'>{value}</span>
        <Button
          size='sm'
          variant='outline'
          aria-label='Aumentar'
          aria-disabled={enTope}
          onClick={() => {
            if (enTope) {
              toast.warning(`Stock máximo en bar: ${max}`);
              return;
            }
            onChange(value + 1);
          }}
          className={`h-7 w-7 rounded-full p-0 transition-all duration-200 ${
            enTope ? 'cursor-not-allowed opacity-40' : 'hover:scale-105'
          }`}
        >
          <Plus className='h-3 w-3' />
        </Button>
      </div>
      {children}
    </div>
  );
}
