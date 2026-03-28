'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Category, useCategories } from '@/hooks/productos/useCategories';
import { toast } from 'sonner';
import { CategoryForm } from '@/components/categories/CategoryForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import SortableCategoryCard from '@/components/categories/SortableCategoryCard';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { CategoriesSkeleton } from '@/components/ui/skeletons';
import { Tag, Plus, Wallet, Loader2 } from 'lucide-react';
import { useCallback } from 'react';
import Paginate from '@/components/ui/paginate';
import { CategoryFilters } from '@/components/categories/CategoryFilters';
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
export default function Categories() {
  const {
    filteredCategories,
    searchTerm,
    setSearchTerm,
    isLoading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    activateCategory,
    deactivateCategory,
    reorderCategories,
    isMutating
  } = useCategories();
  const [filterStatus, setFilterStatus] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editCategory, setEditCategory] = useState<{
    id: string;
    name: string;
    description: string;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const dedupedCategories = useMemo(() => {
    const seen = new Set<string>();
    return filteredCategories.filter(category => {
      const idStr = String(category.id);
      if (seen.has(idStr)) return false;
      seen.add(idStr);
      return true;
    });
  }, [filteredCategories]);

  const filteredByStatus = dedupedCategories.filter(category => {
    if (filterStatus === 'all') return true;
    return String(category.status) === filterStatus;
  });

  const handleCreate = useCallback(async (form: { name: string; description: string }) => {
    const result = await createCategory({
      name: form.name,
      description: form.description
    });
    if (result.success) {
      toast.success(result.message);
      setOpenDialog(false);
    } else {
      toast.error(result.message);
    }
  }, [createCategory]);

  const handleDelete = useCallback(async (id: string) => {
    const result = await deleteCategory(id);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  }, [deleteCategory]);

  const handleEdit = useCallback((category: { id: string; name: string; description: string }) => {
    setEditCategory(category);
    setEditDialog(true);
  }, []);

  const handleUpdate = useCallback(async (form: { name: string; description: string }) => {
    if (!editCategory) return;

    const result = await updateCategory(editCategory.id, {
      name: form.name,
      description: form.description
    });
    if (result.success) {
      toast.success(result.message);
      setEditDialog(false);
      setEditCategory(null);
    } else {
      toast.error(result.message);
    }
  }, [editCategory, updateCategory]);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setFilterStatus('all');
    setPage(1);
  }, [setSearchTerm]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = dedupedCategories.findIndex((cat: Category) => cat.id === active.id);
    const newIndex = dedupedCategories.findIndex((cat: Category) => cat.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newLocalOrder = arrayMove(dedupedCategories, oldIndex, newIndex);
    const result = await reorderCategories(newLocalOrder);

    if (!result.success) {
      toast.error(result.message);
    }
  }, [dedupedCategories, reorderCategories]);

  const handleActivate = useCallback(async (id: string) => {
    await activateCategory(id);
  }, [activateCategory]);

  const handleDeactivate = useCallback(async (id: string) => {
    await deactivateCategory(id);
  }, [deactivateCategory]);

  const totalPages = Math.ceil(filteredByStatus.length / pageSize);
  const paginatedCategories = filteredByStatus.slice((page - 1) * pageSize, page * pageSize);

  const duplicateIds = useMemo(() => {
    const ids = paginatedCategories.map(category => category.id);
    return ids.filter((value, index, array) => array.indexOf(value) !== index);
  }, [paginatedCategories]);

  if (duplicateIds.length) {
    console.error('[Categories] duplicate ids present in paginatedCategories:', duplicateIds);
  }

  if (isLoading) return <CategoriesSkeleton />;

  return (
    <PermissionGuard module='categories' action='view'>
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6'>
          <div>
            <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900'>Categorías</h1>
            <p className='text-sm sm:text-base text-gray-600'>
              Organiza tus productos en categorías
            </p>
          </div>
          <PermissionGuard module='categories' action='create' fallback={null}>
            <Button
              variant='outline'
              className='flex items-center gap-2 rounded-full bg-black text-white dark:bg-white dark:text-black hover:scale-105 transition-all duration-200 text-sm sm:text-base px-6 py-2 w-full sm:w-auto dark:hover:bg-gray-200'
              type='button'
              onClick={() => setOpenDialog(true)}
            >
              <Plus className='w-4 h-4' />
              Nueva Categoría
            </Button>
          </PermissionGuard>
        </div>

        <CategoryFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          onClearFilters={handleClearFilters}
          pageSize={pageSize}
          setPageSize={setPageSize}
          setPage={setPage}
        />

        {error && <div className='text-center text-red-500 text-sm sm:text-base'>{error}</div>}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={paginatedCategories.map(category => category.id)}
            strategy={rectSortingStrategy}
          >
            <div className='grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'>
              {paginatedCategories.map(category => (
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
                  onDelete={handleDelete as any}
                  onActivate={handleActivate as any}
                  onDeactivate={handleDeactivate as any}
                  onEdit={handleEdit as any}
                  isLoading={isMutating}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Paginador usando el componente Paginate */}
        {totalPages > 1 && (
          <div className='flex justify-center mt-4 sm:mt-6'>
            <Paginate page={page} totalPages={totalPages} setPage={setPage} />
          </div>
        )}

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className='max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl'>
            <DialogHeader className='p-6 pb-2 border-b'>
              <DialogTitle className='text-xl font-bold flex items-center gap-2'>
                <Tag className='w-5 h-5 text-purple-600' />
                <span>Nueva Categoría</span>
              </DialogTitle>
              <DialogDescription className='sr-only'>
                Formulario para crear categoría
              </DialogDescription>
            </DialogHeader>

            <div className='flex-1 overflow-y-auto p-6'>
              <CategoryForm
                open={openDialog}
                onSubmit={handleCreate}
                onCancel={() => setOpenDialog(false)}
                hideButtons={true}
              />
            </div>

            <div className='border-t p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center gap-3 px-6 rounded-b-2xl'>
              <Button
                variant='outline'
                onClick={() => setOpenDialog(false)}
                className='rounded-full px-6 dark:hover:bg-white dark:hover:text-black transition-all hover:scale-105'
                disabled={isMutating}
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                form='category-form'
                className='bg-black text-white dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-full px-8 hover:bg-gray-800 transition-all hover:scale-105'
                disabled={isMutating}
              >
                {isMutating ? (
                  <div className='flex items-center gap-2'>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    <span>Guardando...</span>
                  </div>
                ) : (
                  <span>Guardar Categoría</span>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Diálogo editar categoría */}
        {editCategory && (
          <Dialog
            open={editDialog}
            onOpenChange={open => {
              setEditDialog(open);
              if (!open) setEditCategory(null);
            }}
          >
            <DialogContent className='max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl'>
              <DialogHeader className='p-6 pb-2 border-b'>
                <DialogTitle className='text-xl font-bold flex items-center gap-2'>
                  <Tag className='w-5 h-5 text-purple-600' />
                  <span>Editar Categoría</span>
                </DialogTitle>
                <DialogDescription className='sr-only'>
                  Formulario para editar categoría
                </DialogDescription>
              </DialogHeader>

              <div className='flex-1 overflow-y-auto p-6'>
                <CategoryForm
                  open={editDialog}
                  onSubmit={handleUpdate}
                  onCancel={() => {
                    setEditDialog(false);
                    setEditCategory(null);
                  }}
                  initialValues={{ name: editCategory.name, description: editCategory.description }}
                  hideButtons={true}
                />
              </div>

              <div className='border-t p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center gap-3 px-6 rounded-b-2xl'>
                <Button
                  variant='outline'
                  onClick={() => {
                    setEditDialog(false);
                    setEditCategory(null);
                  }}
                  className='rounded-full px-6 dark:hover:bg-white dark:hover:text-black transition-all hover:scale-105'
                  disabled={isMutating}
                >
                  Cancelar
                </Button>
                <Button
                  type='submit'
                  form='category-form'
                  className='bg-black text-white dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-full px-8 hover:bg-gray-800 transition-all hover:scale-105'
                  disabled={isMutating}
                >
                  {isMutating ? (
                    <div className='flex items-center gap-2'>
                      <Loader2 className='w-4 h-4 animate-spin' />
                      <span>Actualizando...</span>
                    </div>
                  ) : (
                    <span>Actualizar Cambios</span>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PermissionGuard>
  );
}
