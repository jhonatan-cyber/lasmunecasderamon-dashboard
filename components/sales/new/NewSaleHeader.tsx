import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const NewSaleHeader = () => {
  const router = useRouter();
  return (
    <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
      <div>
        <h2 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900'>
          Datos Ticket Venta
        </h2>
        <div className='uppercase text-xs tracking-widest text-gray-400 font-semibold mb-1'>
          Las muñecas de Ramón
        </div>
      </div>
      <Button
        variant='outline'
        className='rounded-full px-4 sm:px-6 bg-black text-white hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto'
        onClick={() => router.back()}
      >
        <ArrowLeft className='w-3 h-3 sm:w-4 sm:h-4 mr-1' /> Atrás
      </Button>
    </div>
  );
};
