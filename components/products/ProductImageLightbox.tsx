'use client';

import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle
} from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { ProductPhoto } from '@/components/shared/ProductPhoto';

interface ProductImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt: string;
}

export function ProductImageLightbox({ open, onOpenChange, src, alt }: ProductImageLightboxProps) {
  const closeOnBackdrop = (event: React.MouseEvent<HTMLElement>) => {
    if (event.target === event.currentTarget) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className='bg-black/90 backdrop-blur-sm' />
        <DialogPrimitive.Content
          className='fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 p-4 outline-hidden sm:p-8'
          onClick={closeOnBackdrop}
        >
          <DialogTitle className='sr-only'>Vista ampliada de {alt}</DialogTitle>
          <DialogDescription className='sr-only'>
            Imagen ampliada del producto. Presiona Escape o haz clic fuera de la imagen para cerrar.
          </DialogDescription>

          <div
            className='relative flex min-h-0 w-full flex-1 items-center justify-center'
            onClick={closeOnBackdrop}
          >
            <div
              aria-hidden
              className='pointer-events-none absolute h-[60vmin] w-[60vmin] rounded-full bg-purple-500/25 blur-3xl'
            />
            <div
              data-photo-surface
              className='relative h-[65vmin] w-[85vw] max-w-[65vmin] sm:w-[65vmin]'
            >
              <ProductPhoto
                src={src}
                alt={alt}
                fill
                className='object-contain p-6 drop-shadow-2xl'
              />
            </div>
          </div>

          <p className='text-xs font-medium text-white/70'>Esc para cerrar</p>

          <button
            type='button'
            onClick={() => onOpenChange(false)}
            aria-label='Cerrar vista ampliada'
            className='absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:outline-hidden'
          >
            <X className='h-5 w-5' />
          </button>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
