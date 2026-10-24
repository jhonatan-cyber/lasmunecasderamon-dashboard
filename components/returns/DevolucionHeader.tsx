import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface DevolucionHeaderProps {
  /** Título de la página (p. ej. "Devoluciones de Ventas"). */
  title: string;
  /**
   * Variante del botón atrás:
   * - 'outline': contorno con hover negro (ventas).
   * - 'solid': fondo negro con borde y hover invertido (servicios).
   */
  variant?: 'outline' | 'solid';
}

export function DevolucionHeader({ title, variant = 'outline' }: DevolucionHeaderProps) {
  const isSolid = variant === 'solid';

  return (
    <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6'>
      <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold${isSolid ? ' text-gray-900' : ''}`}>
        {title}
      </h1>
      <Button
        variant='outline'
        size='sm'
        onClick={() => window.history.back()}
        className={
          isSolid
            ? 'w-full sm:w-auto bg-black text-white rounded-full hover:bg-white hover:text-black hover:scale-105 transition-all duration-200 text-sm sm:text-base px-4 sm:px-6 py-2 border-2 dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white'
            : 'rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white text-sm sm:text-base w-full sm:w-auto px-4 sm:px-6 py-2'
        }
      >
        <ArrowLeft className={isSolid ? 'mr-2' : 'w-3 h-3 sm:w-4 sm:h-4 mr-1'} />
        Atrás
      </Button>
    </div>
  );
}
