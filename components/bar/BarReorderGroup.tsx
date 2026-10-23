'use client';

import React from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

interface BarReorderGroupProps {
  /** El arrastre se activa con permiso de edición, sin importar el orden visible. */
  enabled: boolean;
  onMove?: (activeId: string, overId: string) => void;
  children: React.ReactNode;
}

/**
 * Contexto de arrastre compartido por las dos vistas del listado (tarjetas y
 * tabla). No reordena por sí mismo: informa el par origen/destino y la página
 * decide qué hacer con el orden completo.
 */
export function BarReorderGroup({ enabled, onMove, children }: BarReorderGroupProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!enabled || !over || active.id === over.id) return;
    onMove?.(String(active.id), String(over.id));
  };

  return (
    // Sin modificador de límites: el listado del bar vive en columnas
    // independientes y el límite se calculaba sobre la columna de la tarjeta,
    // así que bloquearía cualquier arrastre a otra columna (izquierda/derecha).
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      autoScroll={false}
      onDragEnd={handleDragEnd}
    >
      {children}
    </DndContext>
  );
}
