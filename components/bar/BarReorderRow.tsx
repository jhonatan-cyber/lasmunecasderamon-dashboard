'use client';

import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/utils';

interface BarReorderRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  id: string;
  /** Nombre del producto y presentación para el lector de pantalla. */
  label: string;
  canReorder: boolean;
  disabled?: boolean;
}

/**
 * Fila de la tabla del bar con su manilla de arrastre. La fila es a la vez
 * origen y destino: soltar sobre otra fila mueve la presentación a esa
 * posición. Sin permiso de edición no se registra el destino y la fila se
 * comporta como una fila normal; al soltar, la página pasa a orden manual.
 */
export function BarReorderRow({
  id,
  label,
  canReorder,
  disabled = false,
  children,
  className,
  ...props
}: BarReorderRowProps) {
  const reorderEnabled = canReorder && !disabled;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: !reorderEnabled
  });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id,
    disabled: !reorderEnabled
  });
  const setRefs = (node: HTMLTableRowElement | null) => {
    setNodeRef(node);
    setDroppableRef(node);
  };

  return (
    <TableRow
      ref={setRefs}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        'border-b transition-colors hover:bg-muted/50',
        isDragging && 'relative z-20 opacity-70',
        isOver && !isDragging && 'bg-primary/5',
        className
      )}
      {...props}
    >
      <TableCell className='w-10 px-2'>
        {canReorder && (
          <Button
            variant='unstyled'
            type='button'
            {...attributes}
            {...listeners}
            disabled={disabled}
            aria-label={`Reordenar ${label}`}
            className='cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing disabled:opacity-40'
          >
            <GripVertical className='size-4' aria-hidden='true' />
          </Button>
        )}
      </TableCell>
      {children}
    </TableRow>
  );
}
