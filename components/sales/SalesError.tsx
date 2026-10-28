import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { ErrorState } from '@/components/shared/ErrorState';

interface SalesErrorProps {
  error: string;
  onRetry: () => void;
}

export function SalesError({ error, onRetry }: SalesErrorProps) {
  return (
    <div className='p-4 sm:p-6'>
      <ErrorState
        icon={AlertTriangle}
        title='Error al cargar datos'
        message={error}
        action={
          <Button
            onClick={onRetry}
            size='sm'
            variant='outline'
            className='rounded-full px-4 sm:px-6 hover:scale-105 transition-all duration-200 text-sm sm:text-base'
          >
            <RotateCcw className='h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2' />
            Reintentar
          </Button>
        }
      />
    </div>
  );
}
