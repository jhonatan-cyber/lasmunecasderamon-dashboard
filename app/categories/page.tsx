'use client';

import { useMemo, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useCategories, Category } from '@/hooks/productos/useCategories';
import { useCategoryModals } from '@/hooks/categories/useCategoryModals';
import { CategoryHeader } from '@/components/categories/CategoryHeader';
import { CategoryFilters } from '@/components/categories/CategoryFilters';
import { CategoryGrid } from '@/components/categories/CategoryGrid';
import { CategoryFormModal } from '@/components/categories/CategoryFormModal';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { CategoriesSkeleton } from '@/components/ui/skeletons';
import Paginate from '@/components/ui/paginate';
import { type CategoryFormValues } from '@/components/categories/CategoryFormModal';

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

  const {
    isModalOpen,
    setIsModalOpen,
    isEditMode,
    editCategoryId,
    modalValues,
    openCreateModal,
    openEditModal,
    closeModal
  } = useCategoryModals();

  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const dedupedCategories = useMemo(() => {
    const seen = new Set<string>();
    return filteredCategories.filter(c => {
      const id = String(c.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [filteredCategories]);

  const filteredByStatus = dedupedCategories.filter(c =>
    filterStatus === 'all' ? true : String(c.status) === filterStatus
  );

  const totalPages = Math.ceil(filteredByStatus.length / pageSize);
  const paginatedCategories = filteredByStatus.slice((page - 1) * pageSize, page * pageSize);

  const handleSubmit = useCallback(async (data: CategoryFormValues) => {
    const result = isEditMode && editCategoryId
      ? await updateCategory(editCategoryId, data)
      : await createCategory(data);

    if (result.success) {
      toast.success(result.message);
      closeModal();
    } else {
      toast.error(result.message);
    }
  }, [isEditMode, editCategoryId, createCategory, updateCategory, closeModal]);

  const handleDelete = useCallback(async (id: string) => {
    const result = await deleteCategory(id);
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  }, [deleteCategory]);

  const handleReorder = useCallback(async (newOrder: Category[]) => {
    const result = await reorderCategories(newOrder);
    if (!result.success) toast.error(result.message);
  }, [reorderCategories]);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setFilterStatus('all');
    setPage(1);
  }, [setSearchTerm]);

  if (isLoading) return <CategoriesSkeleton />;

  return (
    <PermissionGuard module='categories' action='view'>
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <CategoryHeader onCreateClick={openCreateModal} />

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

        <CategoryGrid
          categories={paginatedCategories}
          isMutating={isMutating}
          onEdit={openEditModal}
          onDelete={handleDelete}
          onActivate={activateCategory}
          onDeactivate={deactivateCategory}
          onReorder={handleReorder}
        />

        {totalPages > 1 && (
          <div className='flex justify-center mt-4 sm:mt-6'>
            <Paginate page={page} totalPages={totalPages} setPage={setPage} />
          </div>
        )}

        <CategoryFormModal
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          isEditMode={isEditMode}
          initialValues={isEditMode ? modalValues : undefined}
          onSubmit={handleSubmit}
          onCancel={closeModal}
          isMutating={isMutating}
        />
      </div>
    </PermissionGuard>
  );
}
