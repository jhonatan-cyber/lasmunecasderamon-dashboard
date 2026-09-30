'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Encabezado de «Datos Servicio» con el botón de vuelta a salas privadas. */
export const ServicioPageHeader = memo(function ServicioPageHeader() {
  const router = useRouter();
  return (
    <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 sm:mt-6 lg:mt-10 p-4 sm:p-6 lg:p-8 gap-4 sm:gap-6'>
      <div>
        <h2 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white'>
          Datos Servicio
        </h2>
        <div className='uppercase text-xs tracking-widest text-gray-400 font-semibold mb-1'>
          Las muñecas de Ramón
        </div>
      </div>

      <Button
        variant='outline'
        size='sm'
        className='rounded-full px-4 sm:px-6 bg-black text-white hover:scale-110 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto'
        onClick={() => router.push('/private-rooms')}
        type='button'
      >
        <ArrowLeft className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
        Atrás
      </Button>
    </div>
  );
});
