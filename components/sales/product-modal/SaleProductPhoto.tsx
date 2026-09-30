'use client';

import { useState } from 'react';
import { ProductPhoto } from '@/components/shared/ProductPhoto';

/**
 * Foto de una presentación en el modal: usa la del producto y, si falla la
 * carga (o no tiene), cae al `default.png` de imágenes.
 */
export function SaleProductPhoto({
  foto,
  name,
  large
}: {
  foto?: string;
  name: string;
  large: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const fallback = '/api/images/products/default.png';
  const source =
    !foto || foto === 'default.png'
      ? fallback
      : foto.startsWith('http') || foto.startsWith('/')
        ? foto
        : `/api/images/products/${foto}`;
  return (
    <div
      data-photo-surface
      className={
        large
          ? 'relative h-44 w-full shrink-0 overflow-hidden rounded-2xl border border-gray-200/70 bg-white dark:border-white/10 dark:bg-white/[0.04]'
          : 'relative size-20 shrink-0 overflow-hidden rounded-2xl border border-gray-200/70 bg-white dark:border-white/10 dark:bg-white/[0.04]'
      }
    >
      <ProductPhoto
        src={failedSource === source ? fallback : source}
        alt={name}
        fill
        className='object-contain p-2'
        onError={() => setFailedSource(source)}
      />
    </div>
  );
}
