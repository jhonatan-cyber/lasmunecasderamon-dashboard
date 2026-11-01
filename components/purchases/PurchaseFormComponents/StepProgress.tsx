import { Check } from 'lucide-react';

export function StepProgress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <ol aria-label='Pasos de la compra' className='grid grid-cols-3 gap-2'>
      {['Productos', 'Proveedor y pago', 'Confirmar'].map((label, index) => {
        const number = (index + 1) as 1 | 2 | 3;
        const active = step === number;
        const complete = step > number;
        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-xs font-semibold sm:text-sm ${active || complete ? 'border-primary text-foreground' : 'border-muted text-muted-foreground'}`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${active || complete ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
            >
              {complete ? <Check className='h-4 w-4' /> : number}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
