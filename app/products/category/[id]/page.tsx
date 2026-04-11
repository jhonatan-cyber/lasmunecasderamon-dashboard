'use client';
import React, { useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import useProducts from '@/hooks/productos/useProducts';
import { useCategories } from '@/hooks/productos/useCategories';
import ProductCard from '@/components/products/ProductCard';
import { ProductFormModal } from '@/components/products/ProductForm';
import { CategoryProductsHeader } from '@/components/products/CategoryProductsHeader';
import { ProductFilters } from '@/components/products/ProductFilters';
import ProductTable from '@/components/products/ProductTable';
import { useRouter } from 'next/navigation';
import { Product } from '@/types/product';
import Paginate from '@/components/shared/Paginate';
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
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { ProductsSkeleton } from '@/components/shared/Skeletons';

const tablePageSizes = [5, 10, 20, 40];
const cardPageSizes = [8, 12, 24, 48];
const ProductCategoryPage = () => {
  const params = useParams();
  const rawId = params?.id;
  // El categoryId ya es el UUID correcto de la categorÃ­a
  const categoryId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';

  const { filteredCategories, isLoading: categoriesLoading } = useCategories();
  const category = filteredCategories.find(cat => String(cat.id) === String(categoryId));

  const {
    products,
    isLoading,
    isMutating,
    createProduct,
    updateProduct,
    deleteProduct,
    activateProduct,
    deactivateProduct,
    reorderProducts,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus
  } = useProducts(categoryId || '');

  const [openDialog, setOpenDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showTableView, setShowTableView] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(tablePageSizes[0]);
  const [pageCards, setPageCards] = useState(1);
  const [pageSizeCards, setPageSizeCards] = useState(cardPageSizes[0]);
  const [localProductsCards, setLocalProductsCards] = useState<Product[]>([]);
  const router = useRouter();

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

  const filteredProducts = useMemo(() => {
    let result = products;
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter(
        p => p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term)
      );
    }
    if (filterStatus !== null) {
      result = result.filter(p => p.status === filterStatus);
    }
    return result;
  }, [products, searchTerm, filterStatus]);

  React.useEffect(() => {
    setLocalProductsCards(filteredProducts);
  }, [filteredProducts]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const totalPagesCards = Math.ceil(localProductsCards.length / pageSizeCards);

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  const paginatedProductsCards = useMemo(() => {
    const start = (pageCards - 1) * pageSizeCards;
    return localProductsCards.slice(start, start + pageSizeCards);
  }, [localProductsCards, pageCards, pageSizeCards]);

  const handleDragEndCards = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = localProductsCards.findIndex(p => p.id === active.id);
        const newIndex = localProductsCards.findIndex(p => p.id === over.id);

        const newProducts = arrayMove(localProductsCards, oldIndex, newIndex);
        setLocalProductsCards(newProducts);
        reorderProducts(newProducts);
      }
    },
    [localProductsCards, reorderProducts]
  );

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setFilterStatus(null);
    setPage(1);
    setPageCards(1);
  }, [setSearchTerm, setFilterStatus]);

  const handleCreate = useCallback(
    async (form: FormData) => {
      await createProduct(form);
      setOpenDialog(false);
    },
    [createProduct]
  );

  const handleEdit = useCallback((product: Product) => {
    setEditProduct(product);
    setOpenDialog(true);
  }, []);

  const handleUpdate = useCallback(
    async (form: FormData) => {
      await updateProduct(form);
      setEditProduct(null);
      setOpenDialog(false);
    },
    [updateProduct]
  );

  const handleDelete = useCallback(
    async (product: Product) => {
      await deleteProduct(product.id);
    },
    [deleteProduct]
  );

  const handleActivate = useCallback(
    async (product: Product) => {
      await activateProduct(product.id);
    },
    [activateProduct]
  );

  const handleDeactivate = useCallback(
    async (product: Product) => {
      await deactivateProduct(product.id);
    },
    [deactivateProduct]
  );

  const handleBack = () => {
    router.push('/products');
  };

  const handleNewProduct = () => {
    setEditProduct(null);
    setOpenDialog(true);
  };

  if (categoriesLoading || (filteredCategories.length === 0 && categoriesLoading)) {
    return <ProductsSkeleton />;
  }

  if (isLoading) {
    return <ProductsSkeleton />;
  }

  if (!category && categoryId) {
    return (
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div className='text-center text-gray-500 text-sm sm:text-base'>
          CategorÃ­a no encontrada. ID: {categoryId}
        </div>
      </div>
    );
  }

  if (!categoryId) {
    return (
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div className='text-center text-gray-500 text-sm sm:text-base'>
          ID de categorÃ­a invÃ¡lido
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard module='products' action='view'>
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <CategoryProductsHeader
          categoryName={category?.name}
          showTableView={showTableView}
          onToggleView={() => setShowTableView(!showTableView)}
          onBack={handleBack}
          onNewProduct={handleNewProduct}
        />

        <ProductFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          onClearFilters={handleClearFilters}
          pageSize={showTableView ? pageSize : pageSizeCards}
          setPageSize={showTableView ? setPageSize : setPageSizeCards}
          setPage={showTableView ? setPage : setPageCards}
          viewMode={showTableView ? 'table' : 'cards'}
        />

        {/* Vista de tabla solo en desktop */}
        <div className='hidden lg:block'>
          {showTableView ? (
            <>
              <div className='overflow-x-auto'>
                <ProductTable
                  products={paginatedProducts}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onActivate={handleActivate}
                  onDeactivate={handleDeactivate}
                  onReorder={reorderProducts}
                  isLoading={isLoading}
                  isMutating={isMutating}
                  currentPage={page}
                  pageSize={pageSize}
                />
              </div>
              {totalPages > 1 && (
                <div className='flex justify-center mt-4 sm:mt-6'>
                  <Paginate page={page} totalPages={totalPages} setPage={setPage} />
                </div>
              )}
            </>
          ) : (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEndCards}
              >
                <SortableContext
                  items={paginatedProductsCards.map(p => p.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6'>
                    {paginatedProductsCards.map(product => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onActivate={handleActivate}
                        onDeactivate={handleDeactivate}
                        isDraggable={true}
                        isLoading={isMutating}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              {totalPagesCards > 1 && (
                <div className='flex justify-center mt-4 sm:mt-6'>
                  <Paginate page={pageCards} totalPages={totalPagesCards} setPage={setPageCards} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Vista de cards siempre en mÃ³vil */}
        <div className='lg:hidden'>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEndCards}
          >
            <SortableContext
              items={paginatedProductsCards.map(p => p.id)}
              strategy={rectSortingStrategy}
            >
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6'>
                {paginatedProductsCards.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onActivate={handleActivate}
                    onDeactivate={handleDeactivate}
                    isDraggable={true}
                    isLoading={isMutating}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {totalPagesCards > 1 && (
            <div className='flex justify-center mt-4 sm:mt-6'>
              <Paginate page={pageCards} totalPages={totalPagesCards} setPage={setPageCards} />
            </div>
          )}
        </div>

        <ProductFormModal
          open={openDialog}
          onOpenChange={v => {
            if (!v) {
              setOpenDialog(false);
              setEditProduct(null);
            }
          }}
          initialValues={editProduct}
          categoryId={categoryId}
          isLoading={isLoading}
          isMutating={isMutating}
          onSubmit={editProduct ? handleUpdate : handleCreate}
        />
      </div>
    </PermissionGuard>
  );
};

export default ProductCategoryPage;
