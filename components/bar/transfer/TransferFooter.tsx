'use client';

import { memo, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Resumen del traspaso + acciones: cancelar y traspasar (con estado de guardado). */
export const TransferFooter = memo(function TransferFooter({
  saving,
  disabled,
  onCancel,
  summary
}: {
  saving: boolean;
  disabled: boolean;
  onCancel: () => void;
  /** Unidades y valor que se van a traspasar, sobre los botones. */
  summary?: ReactNode;
}) {
  return (
    <div className='space-y-3'>
      {summary}
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
              Transfiriendo...
            </span>
          ) : (
            'Transferir'
          )}
        </Button>
      </div>
    </div>
  );
});
