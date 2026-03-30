'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function PageHeader() {
  const router = useRouter();

  return (
    <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6'>
      <div>
        <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900'>Datos de la cuenta</h1>
        <p className='text-sm sm:text-base text-gray-600'>Captura y verifica información de la nueva cuenta</p>
      </div>
      <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
        <Button
          size='sm'
          variant='outline'
          className='bg-black text-white rounded-full px-6 py-2 hover:bg-white hover:text-black hover:scale-105 transition-all duration-200 border-2 dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white'
          onClick={() => router.push('/accounts')}
        >
          <ArrowLeft className='h-4 w-4' />
          Atrás
        </Button>
      </div>
    </div>
  );
}
