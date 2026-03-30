import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const DevolucionHeader = () => (
  <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6'>
    <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900'>Devoluciones de Servicios</h1>
    <Button
      variant='outline'
      onClick={() => window.history.back()}
      size='sm'
      className='w-full sm:w-auto bg-black text-white rounded-full hover:bg-white hover:text-black hover:scale-105 transition-all duration-200 text-sm sm:text-base px-4 sm:px-6 py-2 border-2 dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white'
    >
      <ArrowLeft className='mr-2' />
      Atrás
    </Button>
  </div>
);
