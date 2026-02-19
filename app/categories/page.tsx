'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useCategories } from '@/hooks/productos/useCategories';
import { toast } from 'sonner';
import CategoryFormDialog from '@/components/categories/CategoryFormDialog';
import SortableCategoryCard from '@/components/categories/SortableCategoryCard';
import { Plus } from 'lucide-react';
import Paginate from '@/components/ui/paginate';
import { CategoryFilters } from '@/components/categories/CategoryFilters';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  UniqueIdentifier
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
  const [localCategories, setLocalCategories] = useState<any[]>([]);

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
  useEffect(() => {
    if (!filteredCategories) return setLocalCategories([]);
    const seen = new Set<any>();
    const unique = filteredCategories.filter((c: any) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
    if (unique.length !== filteredCategories.length) {
      console.warn(
        '[CategoriesPage] duplicate category ids removed before setLocalCategories',
        filteredCategories.map((c: any) => c.id)
      );
    }
    setLocalCategories(unique);
  }, [filteredCategories]);

  // Filtrado real por estado
  const filteredByStatus = localCategories.filter((category: { status: any }) => {
    if (filterStatus === 'all') return true;
    return String(category.status) === filterStatus;
  });

  // Paginación
  const totalPages = Math.ceil(filteredByStatus.length / pageSize);
  const paginatedCategories = filteredByStatus.slice((page - 1) * pageSize, page * pageSize);

  // Función para poner mayúscula inicial a cada palabra
  function toTitleCase(str: string) {
    return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  }

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

  // Manejar drag end — operar sobre el array completo (localCategories) para no perder elementos
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Índices relativos al array completo localCategories
    const oldIndex = localCategories.findIndex(
      (cat: { id: UniqueIdentifier }) => cat.id === active.id
    );
    const newIndex = localCategories.findIndex(
      (cat: { id: UniqueIdentifier }) => cat.id === over.id
    );

    if (oldIndex === -1 || newIndex === -1) return;

    // Guardar respaldo por si hay rollback
    const previous = [...localCategories];

    // Nuevo orden en el array completo
    const newLocalOrder = arrayMove(localCategories, oldIndex, newIndex);

    // Actualizar UI inmediatamente
    setLocalCategories(newLocalOrder);

    // Enviar la lista completa al servidor para persistir display_order
    const result = await reorderCategories(newLocalOrder);

    // El hook `useCategories` ya muestra toasts y mantiene el cache; aquí solo revertimos en caso de fallo
    if (!result.success) {
      setLocalCategories(previous);
    }
  };

  // Debug: detectar ids duplicados antes de render
  const duplicateIds = (() => {
    const ids = paginatedCategories.map((c: any) => c.id);
    return ids.filter((v: any, i: number, a: any[]) => a.indexOf(v) !== i);
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
            <CategoryFormDialog open={openDialog} setOpen={setOpenDialog} onCreate={handleCreate}>
              <Button
                variant='outline'
                className='rounded-full bg-black text-white hover:scale-105 transition-all duration-200 text-sm sm:text-base px-4 sm:px-6 py-2 w-full sm:w-auto'
                type='button'
                size='sm'
              >
                <Plus className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
                Nueva Categoria
              </Button>
            </CategoryFormDialog>
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
            items={paginatedCategories.map((cat: { id: any }) => cat.id)}
            strategy={rectSortingStrategy}
          >
            <div className='grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'>
              {paginatedCategories.map(
                (category: {
                  id: any;
                  description: any;
                  name?: string;
                  status?: number;
                  total_products?: number | undefined;
                  created_at?: string | undefined;
                }) => (
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
                )
              )}
            </div>
          </SortableContext>
        </DndContext>

        {/* Paginador usando el componente Paginate */}
        {totalPages > 1 && (
          <div className='flex justify-center mt-4 sm:mt-6'>
            <Paginate page={page} totalPages={totalPages} setPage={setPage} />
          </div>
        )}

        {/* Pasa los valores iniciales al formulario de edición */}
        {editCategory && (
          <CategoryFormDialog
            open={editDialog}
            setOpen={open => {
              setEditDialog(open);
              if (!open) setEditCategory(null);
            }}
            onCreate={handleUpdate}
            initialValues={{
              name: editCategory.name,
              description: editCategory.description
            }}
          >
            <span />
          </CategoryFormDialog>
        )}
      </div>
    </PermissionGuard>
  );
}
