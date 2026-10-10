'use client';
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import useProducts from '@/hooks/productos/useProducts';
import { useCategories } from '@/hooks/productos/useCategories';
import ProductCard from '@/components/products/ProductCard';
import { ProductFormModal } from '@/components/products/ProductForm';
import { CategoryProductsHeader } from '@/components/products/CategoryProductsHeader';
import { ProductFilters } from '@/components/products/ProductFilters';
import ProductTable from '@/components/products/ProductTable';
import { useRouter } from 'next/navigation';
import { Product, Presentacion } from '@/types/product';
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
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';

const tablePageSizes = [5, 10, 20, 40];
const cardPageSizes = [8, 12, 24, 48];
const PRODUCT_VIEW_STORAGE_KEY = 'products:view-mode';
const PRODUCT_TABLE_PAGE_SIZE_STORAGE_KEY = 'products:table-page-size';
const PRODUCT_CARD_PAGE_SIZE_STORAGE_KEY = 'products:card-page-size';
const ProductCategoryPage = () => {
  const params = useParams();
  const rawId = params?.id;

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
    deletePresentation,
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
  const [editPresentation, setEditPresentation] = useState<Presentacion | null>(null);
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
    setLocalProductsCards(previous =>
      previous.length === filteredProducts.length &&
      previous.every((product, index) => product === filteredProducts[index])
        ? previous
        : filteredProducts
    );
  }, [filteredProducts]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedViewMode = window.localStorage.getItem(PRODUCT_VIEW_STORAGE_KEY);
    const savedTablePageSize = window.localStorage.getItem(PRODUCT_TABLE_PAGE_SIZE_STORAGE_KEY);
    const savedCardPageSize = window.localStorage.getItem(PRODUCT_CARD_PAGE_SIZE_STORAGE_KEY);

    if (savedViewMode === 'table') {
      setShowTableView(true);
    } else if (savedViewMode === 'cards') {
      setShowTableView(false);
    }

    const parsedTablePageSize = Number(savedTablePageSize);
    if (tablePageSizes.includes(parsedTablePageSize)) {
      setPageSize(parsedTablePageSize);
    }

    const parsedCardPageSize = Number(savedCardPageSize);
    if (cardPageSizes.includes(parsedCardPageSize)) {
      setPageSizeCards(parsedCardPageSize);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PRODUCT_VIEW_STORAGE_KEY, showTableView ? 'table' : 'cards');
  }, [showTableView]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PRODUCT_TABLE_PAGE_SIZE_STORAGE_KEY, String(pageSize));
  }, [pageSize]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PRODUCT_CARD_PAGE_SIZE_STORAGE_KEY, String(pageSizeCards));
  }, [pageSizeCards]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const totalPagesCards = Math.ceil(localProductsCards.length / pageSizeCards);
  const isEmpty = !isLoading && filteredProducts.length === 0;

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  const paginatedProductsCards = useMemo(() => {
    const start = (pageCards - 1) * pageSizeCards;
    return localProductsCards.slice(start, start + pageSizeCards);
  }, [localProductsCards, pageCards, pageSizeCards]);

  // Clave estable: los memos de filtros generan arrays nuevos en cada render
  // (searchFields es un literal), así que el efecto debe depender del contenido.
  // Une tabla + cards para que ambas vistas tengan las presentaciones.
  const paginatedIdsKey = [...paginatedProducts, ...paginatedProductsCards]
    .map(p => String(p.id))
    .filter((id, i, arr) => arr.indexOf(id) === i)
    .join(',');

  const { data: presentacionesMap = {}, isPending: presentacionesPending } = useQuery<
    Record<string, Presentacion[]>
  >({
    queryKey: ['product-presentations', paginatedIdsKey],
    enabled: Boolean(paginatedIdsKey),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const response = await fetch(
        `/api/products/presentations?producto_ids=${encodeURIComponent(paginatedIdsKey)}`,
        { cache: 'no-store' }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'No se pudieron cargar las presentaciones');
      }
      return result.data ?? {};
    }
  });

  // Las tarjetas se revelan recién cuando están las presentaciones: así la
  // entrada animada se reproduce una sola vez y con los datos finales.
  const cardsReady = !isLoading && !(Boolean(paginatedIdsKey) && presentacionesPending);
  const cardsGridKey = [
    cardsReady ? 'ready' : 'loading',
    pageCards,
    pageSizeCards,
    filterStatus ?? 'all'
  ].join('-');

  const flatCards: { rowId: string; product: Product; presentation: Presentacion | null }[] =
    useMemo(
      () =>
        paginatedProductsCards.flatMap(product => {
          const pres = presentacionesMap[String(product.id)] ?? [];
          if (pres.length === 0) {
            return [{ rowId: String(product.id), product, presentation: null }] as {
              rowId: string;
              product: Product;
              presentation: Presentacion | null;
            }[];
          }
          return pres.map(p => ({
            rowId: `${product.id}::${p.id}`,
            product,
            presentation: p as Presentacion | null
          }));
        }),

      [paginatedProductsCards, presentacionesMap]
    );

  const handleDragEndCards = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const activeProductId = String(active.id).split('::')[0];
        const overProductId = String(over.id).split('::')[0];
        if (activeProductId === overProductId) return;
        const oldIndex = localProductsCards.findIndex(p => String(p.id) === activeProductId);
        const newIndex = localProductsCards.findIndex(p => String(p.id) === overProductId);
        if (oldIndex === -1 || newIndex === -1) return;

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
      try {
        await createProduct(form);
      } catch {
        // El fallo ya se mostró como toast desde useGenericMutations. Se corta acá para
        // que la promesa no quede sin manejar (Next la reporta como Runtime Error) y el
        // diálogo permanece abierto con los datos cargados para corregirlos.
        return;
      }
      setOpenDialog(false);
    },
    [createProduct]
  );

  const handleEdit = useCallback((product: Product, presentation: Presentacion | null = null) => {
    setEditProduct(product);
    setEditPresentation(presentation);
    setOpenDialog(true);
  }, []);

  const handleUpdate = useCallback(
    async (form: FormData) => {
      try {
        await updateProduct(form);
      } catch {
        // Igual que handleCreate: toast ya emitido, diálogo y datos intactos.
        return;
      }
      setEditProduct(null);
      setEditPresentation(null);
      setOpenDialog(false);
    },
    [updateProduct]
  );

  const handleDelete = useCallback(
    async (product: Product, presentation?: Presentacion | null) => {
      try {
        if (presentation) await deletePresentation(presentation.id);
        else await deleteProduct(product.id);
      } catch {
        // El toast lo emite useGenericMutations; el modal de confirmación ya cerró.
      }
    },
    [deleteProduct, deletePresentation]
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
    setEditPresentation(null);
    setOpenDialog(true);
  };

  if (!category && categoriesLoading) {
    return (
      <BoneyardSkeleton name='category-products-main' loading={true}>
        <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
          <div className='text-center text-gray-500'>Cargando categorías...</div>
        </div>
      </BoneyardSkeleton>
    );
  }

  if (!category && categoryId) {
    return (
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div className='text-center text-gray-500 text-sm sm:text-base'>
          Categoría no encontrada. ID: {categoryId}
        </div>
      </div>
    );
  }

  if (!categoryId) {
    return (
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div className='text-center text-gray-500 text-sm sm:text-base'>
          ID de categoría inválido
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard module='products' action='view'>
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <CategoryProductsHeader
          categoryName={category?.name}
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
          showTableView={showTableView}
          onToggleView={() => setShowTableView(!showTableView)}
        />

        {}
        <div className='hidden lg:block'>
          {showTableView ? (
            <>
              {isEmpty ? (
                <div className='text-center text-gray-500 text-sm sm:text-base py-8'>
                  No hay productos en esta categoría.
                </div>
              ) : (
                <>
                  <div className='overflow-x-auto'>
                    <BoneyardSkeleton name='category-products-table' loading={isLoading}>
                      <ProductTable
                        products={
                          paginatedProducts.length > 0
                            ? paginatedProducts
                            : isLoading
                              ? ([
                                  {
                                    id: 1,
                                    code: 'DUMMY-1',
                                    name: 'Nombre Producto Dummy Largo',
                                    price: 9990,
                                    commission: 1000,
                                    status: 1,
                                    foto: 'default.png'
                                  },
                                  {
                                    id: 2,
                                    code: 'DUMMY-2',
                                    name: 'Nombre Producto Dummy Largo',
                                    price: 9990,
                                    commission: 1000,
                                    status: 1,
                                    foto: 'default.png'
                                  },
                                  {
                                    id: 3,
                                    code: 'DUMMY-3',
                                    name: 'Nombre Producto Dummy Largo',
                                    price: 9990,
                                    commission: 1000,
                                    status: 1,
                                    foto: 'default.png'
                                  }
                                ] as unknown as Product[])
                              : []
                        }
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onActivate={handleActivate}
                        onDeactivate={handleDeactivate}
                        onReorder={reorderProducts}
                        isLoading={isLoading}
                        isMutating={isMutating}
                        currentPage={page}
                        pageSize={pageSize}
                        presentacionesPorProducto={presentacionesMap}
                      />
                    </BoneyardSkeleton>
                  </div>
                  {totalPages > 1 && (
                    <div className='flex justify-center mt-4 sm:mt-6'>
                      <Paginate page={page} totalPages={totalPages} setPage={setPage} />
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {isEmpty ? (
                <div className='text-center text-gray-500 text-sm sm:text-base py-8'>
                  No hay productos en esta categoría.
                </div>
              ) : (
                <>
                  <BoneyardSkeleton name='category-products-cards' loading={!cardsReady}>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEndCards}
                    >
                      <SortableContext
                        items={flatCards.map(c => c.rowId)}
                        strategy={rectSortingStrategy}
                      >
                        <div
                          key={cardsGridKey}
                          className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6'
                        >
                          {(flatCards.length > 0
                            ? flatCards
                            : isLoading
                              ? ([
                                  {
                                    rowId: 'dummy-1',
                                    product: {
                                      id: 1,
                                      code: 'DUMMY-1',
                                      name: 'Nombre Producto Dummy',
                                      price: 9990,
                                      commission: 1000,
                                      status: 1,
                                      foto: 'default.png'
                                    },
                                    presentation: null
                                  },
                                  {
                                    rowId: 'dummy-2',
                                    product: {
                                      id: 2,
                                      code: 'DUMMY-2',
                                      name: 'Nombre Producto Dummy',
                                      price: 9990,
                                      commission: 1000,
                                      status: 1,
                                      foto: 'default.png'
                                    },
                                    presentation: null
                                  },
                                  {
                                    rowId: 'dummy-3',
                                    product: {
                                      id: 3,
                                      code: 'DUMMY-3',
                                      name: 'Nombre Producto Dummy',
                                      price: 9990,
                                      commission: 1000,
                                      status: 1,
                                      foto: 'default.png'
                                    },
                                    presentation: null
                                  },
                                  {
                                    rowId: 'dummy-4',
                                    product: {
                                      id: 4,
                                      code: 'DUMMY-4',
                                      name: 'Nombre Producto Dummy',
                                      price: 9990,
                                      commission: 1000,
                                      status: 1,
                                      foto: 'default.png'
                                    },
                                    presentation: null
                                  }
                                ] as unknown as {
                                  rowId: string;
                                  product: Product;
                                  presentation: Presentacion | null;
                                }[])
                              : []
                          ).map((card, index) => (
                            <ProductCard
                              key={card.rowId}
                              rowId={card.rowId}
                              product={card.product}
                              presentation={card.presentation}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                              onActivate={handleActivate}
                              onDeactivate={handleDeactivate}
                              isDraggable={true}
                              isLoading={isMutating}
                              entranceIndex={index}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </BoneyardSkeleton>
                  {totalPagesCards > 1 && (
                    <div className='flex justify-center mt-4 sm:mt-6'>
                      <Paginate
                        page={pageCards}
                        totalPages={totalPagesCards}
                        setPage={setPageCards}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {}
        <div className='lg:hidden'>
          {isEmpty ? (
            <div className='text-center text-gray-500 text-sm sm:text-base py-8'>
              No hay productos en esta categoría.
            </div>
          ) : (
            <>
              <BoneyardSkeleton name='category-products-mobile' loading={!cardsReady}>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEndCards}
                >
                  <SortableContext
                    items={flatCards.map(c => c.rowId)}
                    strategy={rectSortingStrategy}
                  >
                    <div
                      key={cardsGridKey}
                      className='grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6'
                    >
                      {(flatCards.length > 0
                        ? flatCards
                        : isLoading
                          ? ([
                              {
                                rowId: 'dummy-1',
                                product: {
                                  id: 1,
                                  code: 'DUMMY-1',
                                  name: 'Nombre Producto Dummy',
                                  price: 9990,
                                  commission: 1000,
                                  status: 1,
                                  foto: 'default.png'
                                },
                                presentation: null
                              },
                              {
                                rowId: 'dummy-2',
                                product: {
                                  id: 2,
                                  code: 'DUMMY-2',
                                  name: 'Nombre Producto Dummy',
                                  price: 9990,
                                  commission: 1000,
                                  status: 1,
                                  foto: 'default.png'
                                },
                                presentation: null
                              }
                            ] as unknown as {
                              rowId: string;
                              product: Product;
                              presentation: Presentacion | null;
                            }[])
                          : []
                      ).map((card, index) => (
                        <ProductCard
                          key={card.rowId}
                          rowId={card.rowId}
                          product={card.product}
                          presentation={card.presentation}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onActivate={handleActivate}
                          onDeactivate={handleDeactivate}
                          isDraggable={true}
                          isLoading={isMutating}
                          entranceIndex={index}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </BoneyardSkeleton>
              {totalPagesCards > 1 && (
                <div className='flex justify-center mt-4 sm:mt-6'>
                  <Paginate page={pageCards} totalPages={totalPagesCards} setPage={setPageCards} />
                </div>
              )}
            </>
          )}
        </div>

        <ProductFormModal
          open={openDialog}
          onOpenChange={v => {
            if (!v) {
              setOpenDialog(false);
              setEditProduct(null);
              setEditPresentation(null);
            }
          }}
          initialValues={editProduct}
          presentation={editPresentation}
          categoryId={categoryId}
          categoryName={category?.name}
          isLoading={isLoading}
          isMutating={isMutating}
          onSubmit={editProduct ? handleUpdate : handleCreate}
        />
      </div>
    </PermissionGuard>
  );
};

export default ProductCategoryPage;
