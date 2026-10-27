'use client';

import { useState } from 'react';
import { ExternalLink, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BaucherFotoProps {
  /** Ruta autenticada que sirve la foto guardada (por ejemplo `/api/tickets/<id>/baucher`). */
  src: string;
  /** Detalle que acompaña a la foto: cliente, fecha o número de operación. */
  descripcion: string;
}

/**
 * Foto del baucher de un pago con transferencia.
 *
 * El servidor guarda el archivo y en la fila sólo queda el nombre, así que acá
 * no hay lógica de negocio: miniatura y enlace a la imagen completa, que el
 * navegador puede ampliar. Un pago sin baucher simplemente no renderiza el
 * componente.
 */
export function BaucherFoto({ src, descripcion }: BaucherFotoProps) {
  const [error, setError] = useState(false);

  return (
    <div className='space-y-2 rounded-lg border border-dashed border-amber-400/70 bg-amber-50/60 p-3 dark:border-amber-500/30 dark:bg-amber-500/10'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <p className='flex items-center gap-2 text-sm font-semibold'>
          <Receipt className='h-4 w-4' aria-hidden='true' />
          Baucher de la transferencia
        </p>
        <Button asChild variant='outline' size='sm' className='rounded-full'>
          <a href={src} target='_blank' rel='noreferrer'>
            <ExternalLink className='mr-1 h-4 w-4' aria-hidden='true' />
            Ver completa
          </a>
        </Button>
      </div>
      {error ? (
        <p className='text-xs text-muted-foreground'>No se pudo cargar la foto del baucher.</p>
      ) : (
        <div className='flex justify-center rounded-lg border bg-background p-2'>
          {/* eslint-disable-next-line @next/next/no-img-element -- la foto viene de una ruta autenticada a disco, next/image no la optimiza */}
          <img
            src={src}
            alt={`Baucher de ${descripcion}`}
            loading='lazy'
            onError={() => setError(true)}
            className='max-h-64 w-auto max-w-full object-contain'
          />
        </div>
      )}
    </div>
  );
}
