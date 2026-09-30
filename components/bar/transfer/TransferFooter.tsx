'use client';

import { memo } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Acciones del modal: cancelar y traspasar (con estado de guardado). */
export const TransferFooter = memo(function TransferFooter({
  saving,
  disabled,
  onCancel
}: {
  saving: boolean;
  disabled: boolean;
  onCancel: () => void;
}) {
  return (
    <div className='grid grid-cols-2 gap-2'>
      <Button
        type='button'
        variant='outline'
        onClick={onCancel}
        disabled={saving}
        className='h-11 rounded-full px-6'
      >
        Cancelar
      </Button>
      <Button
        type='submit'
        disabled={disabled}
        className='h-11 rounded-full px-6 bg-black text-white hover:bg-white hover:text-black border-2'
      >
        {saving ? (
          <span className='flex items-center gap-2'>
            <Loader2 className='w-4 h-4 animate-spin' />
            Traspasando...
          </span>
        ) : (
          'Traspasar'
        )}
      </Button>
    </div>
  );
});
