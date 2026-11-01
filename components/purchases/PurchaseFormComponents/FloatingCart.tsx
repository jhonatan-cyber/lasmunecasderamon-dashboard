import { Button } from '@/components/ui/button';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

export function FloatingCart({
  count,
  total,
  onContinue
}: {
  count: number;
  total: number;
  onContinue: () => void;
}) {
  return (
    <div className='fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6'>
      <div className='flex items-center gap-3 rounded-2xl border bg-background/95 p-3 shadow-xl backdrop-blur sm:gap-5 sm:px-4'>
        <div className='min-w-0'>
          <p className='truncate text-sm font-semibold'>
            {count} {count === 1 ? 'presentación' : 'presentaciones'} seleccionadas
          </p>
          <p className='text-xs text-muted-foreground'>Total {formatCurrencyCLP(total)}</p>
        </div>
        <Button type='button' onClick={onContinue} className='shrink-0 rounded-full'>
          Continuar
        </Button>
      </div>
    </div>
  );
}
