'use client';

import { AlertCircle } from 'lucide-react';

interface AdvancesCajaAlertProps {
  cajaLoading: boolean;
  hasOpenCaja: boolean | null;
}

export function AdvancesCajaAlert({ cajaLoading, hasOpenCaja }: AdvancesCajaAlertProps) {
  if (cajaLoading || hasOpenCaja === true || hasOpenCaja === null) return null;

  return (
    <div className='px-4 sm:px-8'>
      <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
        <div className='flex items-center'>
          <AlertCircle className='h-5 w-5 text-yellow-600 mr-2' />
          <div>
            <h3 className='text-sm font-medium text-yellow-800'>Caja cerrada</h3>
            <p className='text-sm text-yellow-700 mt-1'>
              No se pueden crear nuevos anticipos sin una caja abierta. Por favor, abra una
              caja en el módulo de caja primero.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
