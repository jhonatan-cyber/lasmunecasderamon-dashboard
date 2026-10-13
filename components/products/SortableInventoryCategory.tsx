'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { Category } from '@/hooks/productos/useCategories';
import CategoryCard from './CategoryCard';

export function SortableInventoryCategory({
  category,
  disabled,
  canReorder,
  onClick
}: {
  category: Category;
  disabled: boolean;
  canReorder: boolean;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: category.id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative min-w-0 ${isDragging ? 'z-20 opacity-70' : ''}`}
    >
      <CategoryCard category={category} onClick={onClick} />
      {canReorder && (
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          type='button'
          disabled={disabled}
          aria-label={`Mover categoría ${category.name}`}
          className='absolute right-2 top-2 z-10 rounded-lg border bg-white p-2 text-neutral-500 shadow-sm touch-none cursor-grab active:cursor-grabbing disabled:opacity-40 dark:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
        >
          <GripVertical className='h-4 w-4' aria-hidden='true' />
        </button>
      )}
    </div>
  );
}
