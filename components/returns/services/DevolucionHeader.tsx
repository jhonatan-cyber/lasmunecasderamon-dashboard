import { Button } from '@/components/ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {faArrowLeft } from '@fortawesome/free-solid-svg-icons';

export const DevolucionHeader = () => (
  <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6'>
    <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900'>Devoluciones de Servicios</h1>
    <Button
      variant='outline'
      onClick={() => window.history.back()}
      size='sm'
      className='w-full sm:w-auto bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base px-4 sm:px-6 py-2'
    >
      <FontAwesomeIcon icon={faArrowLeft} className='mr-2' />
      Atrás
    </Button>
  </div>
);
