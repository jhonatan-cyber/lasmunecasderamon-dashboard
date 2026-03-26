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
import { Plus } from 'lucide-react';
import Paginate from '@/components/ui/paginate';
import { CategoryFilters } from '@/components/categories/CategoryFilters';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { CategoriesSkeleton } from '@/components/ui/skeletons';
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
    // lista completa
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
    reorderCategories
  } = useCategories();
  const [filterStatus, setFilterStatus] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editCategory, setEditCategory] = useState<{
    id: number;
    name: string;
    description: string;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Configurar sensores para drag and drop
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

  // Sincronizar categorías locales con la lista completa (no con el subconjunto filtrado)
  // Además deduplicar por seguridad para evitar `key` duplicadas en el render
  const dedupedCategories = useMemo(() => {
    const seen = new Set<number>();
    return filteredCategories.filter(category => {
      if (seen.has(category.id)) return false;
      seen.add(category.id);
      return true;
    });
  }, [filteredCategories]);

  const filteredByStatus = dedupedCategories.filter(category => {
    if (filterStatus === 'all') return true;
    return String(category.status) === filterStatus;
  });

  // Paginación
  const totalPages = Math.ceil(filteredByStatus.length / pageSize);
  const paginatedCategories = filteredByStatus.slice((page - 1) * pageSize, page * pageSize);

  if (isLoading) return <CategoriesSkeleton />;

  const handleCreate = async (form: { name: string; description: string }) => {
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
  };

  const handleDelete = async (id: number) => {
    const result = await deleteCategory(id);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleEdit = (category: { id: number; name: string; description: string }) => {
    setEditCategory(category);
    setEditDialog(true);
  };

  const handleUpdate = async (form: { name: string; description: string }) => {
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
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setPage(1);
  };

  // Manejar drag end usando la lista deduplicada actual.
  const handleDragEnd = async (event: DragEndEvent) => {
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
  };

  // Debug: detectar ids duplicados antes de render
  const duplicateIds = (() => {
    const ids = paginatedCategories.map(category => category.id);
    return ids.filter((value, index, array) => array.indexOf(value) !== index);
  })();
  if (duplicateIds.length) {
    console.error('[Categories] duplicate ids present in paginatedCategories:', duplicateIds);
  }

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
              className='rounded-full bg-black text-white hover:scale-105 transition-all duration-200 text-sm sm:text-base px-4 sm:px-6 py-2 w-full sm:w-auto'
              type='button'
              size='sm'
              onClick={() => setOpenDialog(true)}
            >
              <Plus className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
              Nueva Categoria
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
                    id: category.id,
                    name: category.name ?? '',
                    description: category.description ?? '',
                    status: category.status ?? 1,
                    total_products: category.total_products,
                    created_at: category.created_at
                  }}
                  onDelete={handleDelete}
                  onActivate={async id => {
                    const result = await activateCategory(id);
                    if (result.success) toast.success(result.message);
                    else toast.error(result.message);
                  }}
                  onDeactivate={async id => {
                    const result = await deactivateCategory(id);
                    if (result.success) toast.success(result.message);
                    else toast.error(result.message);
                  }}
                  onEdit={handleEdit}
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

        {/* Diálogo crear categoría */}
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className='sm:max-w-md w-[95vw] max-w-[95vw] sm:w-auto max-h-[90vh] flex flex-col p-0'>
            <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
              <DialogTitle className='text-lg sm:text-xl'>Nueva Categoría</DialogTitle>
              <DialogDescription className='sr-only'>
                Formulario para crear categoría
              </DialogDescription>
            </DialogHeader>
            <div className='flex-1 overflow-y-auto px-6 py-4'>
              <CategoryForm
                open={openDialog}
                onSubmit={handleCreate}
                onCancel={() => setOpenDialog(false)}
                hideButtons={true}
              />
            </div>
            <div className='flex-shrink-0 border-t px-6 py-4'>
              <div className='flex flex-col sm:flex-row justify-center gap-2 sm:gap-4'>
                <Button
                  size='sm'
                  variant='outline'
                  type='button'
                  onClick={() => setOpenDialog(false)}
                  className='rounded-full px-6 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white w-full sm:w-auto'
                >
                  Cancelar
                </Button>
                <Button
                  type='submit'
                  form='category-form'
                  size='sm'
                  variant='outline'
                  className='rounded-full px-6 bg-black text-white hover:scale-105 transition-all duration-200 w-full sm:w-auto'
                >
                  Guardar
                </Button>
              </div>
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
            <DialogContent className='sm:max-w-md w-[95vw] max-w-[95vw] sm:w-auto max-h-[90vh] flex flex-col p-0'>
              <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
                <DialogTitle className='text-lg sm:text-xl'>Editar Categoría</DialogTitle>
                <DialogDescription className='sr-only'>
                  Formulario para editar categoría
                </DialogDescription>
              </DialogHeader>
              <div className='flex-1 overflow-y-auto px-6 py-4'>
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
              <div className='flex-shrink-0 border-t px-6 py-4'>
                <div className='flex flex-col sm:flex-row justify-center gap-2 sm:gap-4'>
                  <Button
                    size='sm'
                    variant='outline'
                    type='button'
                    onClick={() => {
                      setEditDialog(false);
                      setEditCategory(null);
                    }}
                    className='rounded-full px-6 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white w-full sm:w-auto'
                  >
                    Cancelar
                  </Button>
                  <Button
                    type='submit'
                    form='category-form'
                    size='sm'
                    variant='outline'
                    className='rounded-full px-6 bg-black text-white hover:scale-105 transition-all duration-200 w-full sm:w-auto'
                  >
                    Actualizar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PermissionGuard>
  );
}
