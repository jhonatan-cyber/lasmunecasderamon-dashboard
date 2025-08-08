import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const DevolucionHeader = () => (
  <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6'>
    <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold'>Devoluciones de Ventas</h1>
    <Button
      variant='outline'
      size='sm'
      onClick={() => window.history.back()}
      className='rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white text-sm sm:text-base w-full sm:w-auto px-4 sm:px-6 py-2'
    >
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
      Atrás
    </Button>
  </div>
);
