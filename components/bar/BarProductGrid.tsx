'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { BarCard } from '@/components/bar/BarCard';
import { BarReorderGroup } from '@/components/bar/BarReorderGroup';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/utils';
import type { BarStockItem } from '@/components/bar/transfer/transferOptions';

interface BarProductGridProps {
  items: BarStockItem[];
  /** Solo con permiso de edición; el orden visible no lo bloquea. */
  canReorder?: boolean;
  /** Mientras se guarda el orden se evita encadenar otro arrastre. */
  reordering?: boolean;
  onMove?: (activeId: string, overId: string) => void;
}

function BarReorderCard({
  item,
  entranceIndex,
  enabled
}: {
  item: BarStockItem;
  entranceIndex: number;
  enabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    disabled: !enabled
  });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: item.id,
    disabled: !enabled
  });
  const setRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    setDroppableRef(node);
  };
  const dragHandle = enabled ? (
    <Button
      variant='unstyled'
      type='button'
      {...attributes}
      {...listeners}
      aria-label={`Reordenar ${item.producto_nombre} ${item.nombre}`}
      className='cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing'
    >
      <GripVertical className='size-4' aria-hidden='true' />
    </Button>
  ) : undefined;

  return (
    <div
      ref={setRefs}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        'w-full min-w-0',
        isDragging && 'relative z-20 opacity-70',
        isOver && !isDragging && 'rounded-3xl ring-2 ring-primary/50'
      )}
    >
      <BarCard item={item} entranceIndex={entranceIndex} dragHandle={dragHandle} />
    </div>
  );
}

/** Columnas independientes: abrir una tarjeta solo desplaza su propia columna. */
export function BarProductGrid({
  items,
  canReorder = false,
  reordering = false,
  onMove
}: BarProductGridProps) {
  const container = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(1);
  const reorderEnabled = canReorder && !reordering;

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const update = () => {
      const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 16;
      const width = element.getBoundingClientRect().width;
      setColumnCount(Math.max(1, Math.floor((width + gap) / (250 + gap))));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <BarReorderGroup enabled={reorderEnabled} onMove={onMove}>
      <div
        ref={container}
        className='gap-4 sm:gap-5'
        style={{ display: 'flex', alignItems: 'flex-start' }}
      >
        {Array.from({ length: columnCount }, (_, column) => (
          <div
            key={column}
            data-product-column={column}
            className='gap-4 sm:gap-5'
            style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0%', minWidth: 0 }}
          >
            {items.map((item, index) =>
              index % columnCount === column ? (
                <BarReorderCard
                  key={item.id}
                  item={item}
                  entranceIndex={index}
                  enabled={reorderEnabled}
                />
              ) : null
            )}
          </div>
        ))}
      </div>
    </BarReorderGroup>
  );
}
