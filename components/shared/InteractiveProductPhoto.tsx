'use client';

import React, { useState } from 'react';
import { motion, MotionConfig, useReducedMotion, useSpring } from 'motion/react';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { ProductImageLightbox } from '@/components/products/ProductImageLightbox';

interface InteractiveProductPhotoProps {
  src: string;
  alt: string;
  /** Clases del contenedor que hace de superficie aislada de la foto. */
  containerClassName?: string;
  /** Clases del propio ProductPhoto (relleno, padding, object-fit). */
  photoClassName?: string;
  onError?: () => void;
  /** Overlay por encima del botón (badges, etc.). */
  children?: React.ReactNode;
}

/**
 * Foto de producto con tilt 3D al hover, flotación en reposo y clic que abre
 * la vista ampliada plana. `MotionConfig reducedMotion='user'` y `useReducedMotion`
 * anulan las animaciones cuando el sistema pide movimiento reducido.
 */
export function InteractiveProductPhoto({
  src,
  alt,
  containerClassName,
  photoClassName = 'object-contain p-4',
  onError,
  children
}: InteractiveProductPhotoProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const tiltRotateX = useSpring(0, { stiffness: 220, damping: 18 });
  const tiltRotateY = useSpring(0, { stiffness: 220, damping: 18 });

  const handleMouseMove = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (prefersReducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = (event.clientX - rect.left) / rect.width - 0.5;
    const relativeY = (event.clientY - rect.top) / rect.height - 0.5;
    tiltRotateY.set(relativeX * 14);
    tiltRotateX.set(-relativeY * 14);
  };

  const handleMouseLeave = () => {
    tiltRotateX.set(0);
    tiltRotateY.set(0);
  };

  return (
    <MotionConfig reducedMotion='user'>
      <div data-photo-surface className={containerClassName}>
        <motion.button
          type='button'
          onClick={() => setLightboxOpen(true)}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          aria-label={`Ver ${alt} en grande`}
          className='absolute inset-0 h-full w-full cursor-zoom-in border-0 bg-transparent p-0 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-inset focus-visible:outline-hidden'
          style={{ rotateX: tiltRotateX, rotateY: tiltRotateY, transformPerspective: 900 }}
          whileHover={{ scale: 1.06 }}
          transition={{ scale: { duration: 0.4, ease: 'easeOut' } }}
        >
          <motion.div
            className='absolute inset-0'
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ProductPhoto src={src} alt={alt} fill className={photoClassName} onError={onError} />
          </motion.div>
        </motion.button>
        {children}
      </div>
      <ProductImageLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        src={src}
        alt={alt}
      />
    </MotionConfig>
  );
}
