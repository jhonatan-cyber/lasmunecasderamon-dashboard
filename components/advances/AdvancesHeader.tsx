'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface AdvancesHeaderProps {
  canCreate: boolean;
  hasOpenCaja: boolean | null;
  cajaLoading: boolean;
  onOpenDialog: () => void;
}

export function AdvancesHeader({ canCreate, onOpenDialog }: AdvancesHeaderProps) {
  return (
    <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 pt-4 sm:pt-8 px-4 sm:px-8'>
      <div>
        <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-foreground'>Anticipos</h1>
        <p className='text-sm sm:text-base text-muted-foreground mt-2'>
          Solicitudes, aprobación administrativa y entrega por caja
        </p>
      </div>
      {canCreate && (
        <Button onClick={onOpenDialog} className='rounded-full'>
          <Plus className='mr-2' />
          Nueva solicitud
        </Button>
      )}
    </div>
  );
}
