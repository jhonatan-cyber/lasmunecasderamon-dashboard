'use client';

import { Button } from '@/components/ui/button';
import { Plus, AlertCircle } from 'lucide-react';

interface AdvancesHeaderProps {
  canCreate: boolean;
  hasOpenCaja: boolean | null;
  cajaLoading: boolean;
  onOpenDialog: () => void;
}

export function AdvancesHeader({ 
  canCreate, 
  hasOpenCaja, 
  cajaLoading, 
  onOpenDialog 
}: AdvancesHeaderProps) {
  return (
    <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 pt-4 sm:pt-8 px-4 sm:px-8'>
      <div className='flex items-center gap-4'>
        <div>
          <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900'>Anticipos</h1>
          <p className='text-sm sm:text-base text-gray-600 mt-2'>
            Gestiona los anticipos de sueldo del personal
          </p>
        </div>
      </div>
      {canCreate && (
        <Button
          onClick={onOpenDialog}
          disabled={cajaLoading || !hasOpenCaja}
          className={`w-full sm:w-auto rounded-full px-4 sm:px-6 py-2 shadow transition-all duration-200 text-sm sm:text-base ${
            hasOpenCaja
              ? 'bg-black text-white hover:scale-105'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {cajaLoading ? (
            <>
              <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2' />
              Verificando...
            </>
          ) : hasOpenCaja ? (
            <>
              <Plus className='mr-2' />
              Nuevo Anticipo
            </>
          ) : (
            <>
              <AlertCircle className='mr-2' />
              Sin Caja
            </>
          )}
        </Button>
      )}
    </div>
  );
}
