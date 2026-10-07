'use client';

import React from 'react';
import { motion, MotionConfig } from 'motion/react';

interface StaggeredEntranceProps {
  /** Posición en la grilla: define el retardo de entrada (tope en la 9ª). */
  index?: number;
  className?: string;
  children: React.ReactNode;
}

/**
 * Entrada animada de tarjetas: fade + subida con escala, escalonada por índice.
 * Con `reducedMotion='user'` se anula cuando el sistema pide movimiento reducido.
 */
export function StaggeredEntrance({ index, className, children }: StaggeredEntranceProps) {
  return (
    <MotionConfig reducedMotion='user'>
      <motion.div
        className={className}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: 0.45,
          ease: 'easeOut',
          delay: Math.min(index ?? 0, 8) * 0.06
        }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
