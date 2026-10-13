'use client';

import { useRouter } from 'next/navigation';
import { useCategories, Category } from '@/hooks/productos/useCategories';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { SortableInventoryCategory } from '@/components/products/SortableInventoryCategory';
import { useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { Button } from '@/components/ui/button';
import { dragModifiers } from '@/components/shared/dragBounds';
import { PackageCheck } from 'lucide-react';

export function ProductsPageClient() {
  const router = useRouter();
  const { filteredCategories, isLoading: categoriesLoading, reorderCategories } = useCategories();
  const { hasPermission } = useUserPermissions();
  const canReorder = hasPermission('categories', 'edit');
  const [savingOrder, setSavingOrder] = useState(false);
  const savingRef = useRef(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const activeCategories = (filteredCategories as Category[]).filter(cat => cat.status === 1);

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!canReorder || savingRef.current || !over || active.id === over.id) return;
    const from = activeCategories.findIndex(cat => cat.id === active.id);
    const to = activeCategories.findIndex(cat => cat.id === over.id);
    if (from < 0 || to < 0) return;
    const reordered = arrayMove(activeCategories, from, to);
    let index = 0;
    // Conserva las categorías inactivas en sus posiciones y en la caché compartida.
    const fullOrder = filteredCategories.map(cat => (cat.status === 1 ? reordered[index++] : cat));
    savingRef.current = true;
    setSavingOrder(true);
    try {
      await reorderCategories(fullOrder);
    } finally {
      savingRef.current = false;
      setSavingOrder(false);
    }
  };

  return (
    <PermissionGuard module='products' action='view'>
      <BoneyardSkeleton name='products-main' loading={categoriesLoading}>
        <div className='min-w-0 max-w-full overflow-x-clip p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            <div>
              <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white'>
                Bodega
              </h1>
              <p className='text-sm sm:text-base text-gray-600'>
                Selecciona una categoría para ver sus productos
              </p>
            </div>
            <PermissionGuard module='products' action='confirm_container_return'>
              <Button
                variant='outline'
                onClick={() => router.push('/products/containers')}
                className='rounded-full flex items-center gap-2 self-start sm:self-auto'
              >
                <PackageCheck className='w-4 h-4' />
                Envases devueltos
              </Button>
            </PermissionGuard>
          </div>

          {savingOrder && (
            <p className='text-sm text-muted-foreground' role='status'>
              Guardando orden…
            </p>
          )}

          {activeCategories.length === 0 ? (
            <div className='text-center text-gray-500 text-sm sm:text-base'>
              No hay categorías activas.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={dragModifiers}
              autoScroll={false}
            >
              <SortableContext
                items={activeCategories.map(cat => cat.id)}
                strategy={rectSortingStrategy}
              >
                <div className='grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                  {activeCategories.map(cat => (
                    <SortableInventoryCategory
                      key={cat.id}
                      category={cat}
                      canReorder={canReorder}
                      disabled={!canReorder || savingOrder}
                      onClick={() => router.push(`/products/category/${cat.id}`)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </BoneyardSkeleton>
    </PermissionGuard>
  );
}
