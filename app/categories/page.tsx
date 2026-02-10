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
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
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
  const [localCategories, setLocalCategories] = useState(filteredCategories);

  // Configurar sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sincronizar categorías locales con las filtradas
  useEffect(() => {
    setLocalCategories(filteredCategories);
  }, [filteredCategories]);

  // Filtrado real por estado
  const filteredByStatus = localCategories.filter(category => {
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

  // Manejar drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = filteredByStatus.findIndex(cat => cat.id === active.id);
    const newIndex = filteredByStatus.findIndex(cat => cat.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(filteredByStatus, oldIndex, newIndex);
      setLocalCategories(newOrder);

      // Guardar el nuevo orden en el servidor
      const result = await reorderCategories(newOrder);
      if (result.success) {
        toast.success('Orden actualizado correctamente');
      } else {
        toast.error(result.message);
        // Revertir el orden si falla
        setLocalCategories(filteredByStatus);
      }
    }
  };

  return (
    <PermissionGuard module="categorias" action="listar">
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6'>
          <div>
            <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900'>Categorías</h1>
            <p className='text-sm sm:text-base text-gray-600'>Organiza tus productos en categorías</p>
          </div>
          <PermissionGuard module="categorias" action="crear" fallback={null}>
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

      {isLoading && <div className='text-center text-gray-500 text-sm sm:text-base'>Cargando categorías...</div>}
      {error && <div className='text-center text-red-500 text-sm sm:text-base'>{error}</div>}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={paginatedCategories.map(cat => cat.id)}
          strategy={rectSortingStrategy}
        >
          <div className='grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'>
            {paginatedCategories.map(category => (
              <SortableCategoryCard
                key={category.id}
                category={{ ...category, description: category.description ?? '' }}
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
