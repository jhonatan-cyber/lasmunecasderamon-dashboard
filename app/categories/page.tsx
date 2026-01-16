'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCategories } from '@/hooks/useCategories';
import { toast } from 'sonner';
import CategoryFormDialog from '@/components/categories/CategoryFormDialog';
import CategoryCard from '@/components/categories/CategoryCard';
import { Plus } from 'lucide-react';
import Paginate from '@/components/ui/paginate';
import { CategoryFilters } from '@/components/categories/CategoryFilters';

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
    deactivateCategory
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

  // Filtrado real por estado
  const filteredByStatus = filteredCategories.filter(category => {
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
    // Verificar si ya existe una categoría con el mismo nombre
    const exists = filteredCategories.some(
      cat => cat.name.trim().toLowerCase() === form.name.trim().toLowerCase()
    );
    if (exists) {
      toast.error('Ya existe una categoría con ese nombre.');
      return;
    }
    const result = await createCategory({
      name: toTitleCase(form.name),
      description: toTitleCase(form.description)
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
    // Verificar si ya existe otra categoría con el mismo nombre
    const exists = filteredCategories.some(
      cat =>
        cat.id !== editCategory.id &&
        cat.name.trim().toLowerCase() === form.name.trim().toLowerCase()
    );
    if (exists) {
      toast.error('Ya existe una categoría con ese nombre.');
      return;
    }
    const result = await updateCategory(editCategory.id, {
      name: toTitleCase(form.name),
      description: toTitleCase(form.description)
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

  return (
    <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6'>
        <div>
          <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900'>Categorías</h1>
          <p className='text-sm sm:text-base text-gray-600'>Organiza tus productos en categorías</p>
        </div>
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

      <div className='grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'>
        {paginatedCategories.map(category => (
          <CategoryCard
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
  );
}
