import { Loader2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

export function StepActions({
  step,
  saving,
  linesCount,
  total,
  onBack,
  onNext
}: {
  step: 1 | 2 | 3;
  saving: boolean;
  linesCount: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
}) {
  if (step === 1) return null;

  return (
    <div className='flex flex-wrap items-center justify-between gap-3 border-t pt-4'>
      <p className='text-sm text-muted-foreground'>
        {linesCount} presentaciones · Total {formatCurrencyCLP(total)}
      </p>
      <div className='flex gap-2'>
        <Button
          type='button'
          variant='outline'
          className='rounded-full'
          onClick={onBack}
          disabled={saving}
        >
          Atrás
        </Button>
        {step === 2 && (
          <Button type='button' onClick={onNext} disabled={saving} className='rounded-full'>
            Revisar compra
          </Button>
        )}
        {step === 3 && (
          <Button type='submit' disabled={saving || linesCount === 0} className='rounded-full'>
            {saving ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Registrando...
              </>
            ) : (
              <>
                <ShoppingBag className='mr-2 h-4 w-4' />
                Finalizar compra
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
