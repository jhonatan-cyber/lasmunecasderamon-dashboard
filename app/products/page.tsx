"use client";
import React from "react";
import { useCategories, Category } from "@/hooks/productos/useCategories";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import CategoryCard from "@/components/products/CategoryCard";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { ProductsSkeleton } from "@/components/ui/skeletons";

import { useState, useCallback, useMemo } from "react";
import { ProductForm } from '@/components/products/ProductForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { ProductFilters } from '@/components/products/ProductFilters';
import ProductTable from '@/components/products/ProductTable';
import ProductCard from '@/components/products/ProductCard';
import Paginate from '@/components/ui/paginate';
import useProducts from '@/hooks/productos/useProducts';
import { cn } from '@/lib/utils/utils';
import { Table, Grid3X3, Plus, ArrowLeft, Loader2 } from 'lucide-react';
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
import { Product } from '@/types/product';

const tablePageSizes = [5, 10, 20, 40];
const cardPageSizes = [8, 12, 24, 48];

const ProductsPage = () => {
  const { filteredCategories, isLoading: categoriesLoading } = useCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  const category = filteredCategories.find(cat => String(cat.id) === String(selectedCategoryId));
  const activeCategories = (filteredCategories as Category[]).filter((cat) => cat.status === 1);

 
  const {
    products,
    isLoading: productsLoading,
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
  } = useProducts(selectedCategoryId || '');

  const [openDialog, setOpenDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showTableView, setShowTableView] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(tablePageSizes[0]);
  const [pageCards, setPageCards] = useState(1);
  const [pageSizeCards, setPageSizeCards] = useState(cardPageSizes[0]);
  const [localProductsCards, setLocalProductsCards] = useState<Product[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filteredProducts = useMemo(() => {
    let result = products;
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter(p => p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term));
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

  const handleDragEndCards = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localProductsCards.findIndex(p => p.id === active.id);
      const newIndex = localProductsCards.findIndex(p => p.id === over.id);
      const newProducts = arrayMove(localProductsCards, oldIndex, newIndex);
      setLocalProductsCards(newProducts);
      reorderProducts(newProducts);
    }
  }, [localProductsCards, reorderProducts]);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setFilterStatus(null);
    setPage(1);
    setPageCards(1);
  }, [setSearchTerm, setFilterStatus]);

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
  };

  if (categoriesLoading) return <ProductsSkeleton />;

  if (!selectedCategoryId) {
    return (
      <PermissionGuard module="products" action="view">
        <div className="p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Productos</h1>
            <p className="text-sm sm:text-base text-gray-600">Selecciona una categoría para ver sus productos</p>
          </div>

          {activeCategories.length === 0 ? (
            <div className="text-center text-gray-500 text-sm sm:text-base">No hay categorías activas.</div>
          ) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activeCategories.map((cat) => (
                <CategoryCard key={cat.id} category={cat} onClick={() => handleCategoryClick(cat.id)} />
              ))}
            </div>
          )}
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard module="products" action="view">
      <div className="p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              Productos: {category?.name}
            </h1>
            <p className="text-sm sm:text-base text-gray-600">Gestión de productos de la categoría.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <div className="hidden sm:flex gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "flex items-center gap-2 rounded-full hover:scale-105 transition-all duration-200 text-xs sm:text-sm",
                  showTableView ? "bg-blue-50 text-blue-700 border-blue-300" : ""
                )}
                onClick={() => setShowTableView(!showTableView)}
              >
                {showTableView ? <><Table className="w-4 h-4" /> Tabla</> : <><Grid3X3 className="w-4 h-4" /> Cards</>}
              </Button>
            </div>
            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                className="rounded-full hover:scale-105 transition-all text-sm"
                onClick={() => setSelectedCategoryId(null)}
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Atrás
              </Button>
              <PermissionGuard module="products" action="create" fallback={null}>
                <Button
                  className="bg-black text-white dark:bg-white dark:text-black rounded-full hover:scale-105 transition-all text-sm"
                  onClick={() => { setEditProduct(null); setOpenDialog(true); }}
                >
                  <Plus className="w-4 h-4 mr-1" /> Nuevo
                </Button>
              </PermissionGuard>
            </div>
          </div>
        </div>

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

        {productsLoading ? <ProductsSkeleton /> : (
          showTableView ? (
            <>
              <ProductTable
                products={paginatedProducts}
                onEdit={(p) => { setEditProduct(p); setOpenDialog(true); }}
                onDelete={(p) => deleteProduct(p.id)}
                onActivate={(p) => activateProduct(p.id)}
                onDeactivate={(p) => deactivateProduct(p.id)}
                onReorder={reorderProducts}
                isLoading={productsLoading}
                isMutating={isMutating}
                currentPage={page}
                pageSize={pageSize}
              />
              {totalPages > 1 && <Paginate page={page} totalPages={totalPages} setPage={setPage} />}
            </>
          ) : (
            <>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndCards}>
                <SortableContext items={paginatedProductsCards.map(p => p.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {paginatedProductsCards.map(p => (
                      <ProductCard key={p.id} product={p} onEdit={(p) => { setEditProduct(p); setOpenDialog(true); }} onDelete={(p) => deleteProduct(p.id)} onActivate={(p) => activateProduct(p.id)} onDeactivate={(p) => deactivateProduct(p.id)} isDraggable />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              {totalPagesCards > 1 && <Paginate page={pageCards} totalPages={totalPagesCards} setPage={setPageCards} />}
            </>
          )
        )}

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className='max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl'>
            <DialogHeader className='p-6 pb-2 border-b'>
              <DialogTitle className='text-xl font-bold'>
                {editProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </DialogTitle>
              <DialogDescription className='sr-only'>
                Formulario para crear o editar productos
              </DialogDescription>
            </DialogHeader>

            <div className='flex-1 overflow-y-auto p-6'>
              <ProductForm
                open={openDialog}
                onCancel={() => setOpenDialog(false)}
                onSubmit={async (f) => {
                  editProduct ? await updateProduct(f) : await createProduct(f);
                  setOpenDialog(false);
                }}
                initialValues={editProduct}
                categoryId={selectedCategoryId || ''}
                isLoading={productsLoading}
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
                form='product-form'
                className='bg-black text-white dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-full px-8 hover:bg-gray-800 transition-all hover:scale-105'
                disabled={isMutating}
              >
                {isMutating ? (
                  <div className='flex items-center gap-2'>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    <span>{editProduct ? 'Actualizando...' : 'Guardando...'}</span>
                  </div>
                ) : (
                  <span>{editProduct ? 'Actualizar' : 'Guardar'}</span>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
};

export default ProductsPage; 