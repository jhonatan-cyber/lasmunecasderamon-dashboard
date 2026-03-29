'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { Category } from '@/hooks/productos/useCategories';
import SortableCategoryCard from './SortableCategoryCard';

interface CategoryGridProps {
  categories: Category[];
  isMutating: boolean;
  onEdit: (category: { id: string; name: string; description: string }) => void;
  onDelete: (id: string) => void;
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  onReorder: (newOrder: Category[]) => void;
}

export function CategoryGrid({
  categories,
  isMutating,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  onReorder
}: CategoryGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex(cat => cat.id === active.id);
    const newIndex = categories.findIndex(cat => cat.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(categories, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={categories.map(c => c.id)} strategy={rectSortingStrategy}>
        <div className='grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'>
          {categories.map(category => (
            <SortableCategoryCard
              key={category.id}
              category={{
                id: String(category.id),
                name: category.name ?? '',
                description: category.description ?? '',
                status: category.status ?? 1,
                total_products: category.total_products,
                created_at: category.created_at
              }}
              onDelete={onDelete as any}
              onActivate={onActivate as any}
              onDeactivate={onDeactivate as any}
              onEdit={onEdit as any}
              isLoading={isMutating}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
