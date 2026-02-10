"use client";
import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import useProducts from "@/hooks/productos/useProducts";
import { useCategories } from "@/hooks/productos/useCategories";
import ProductCard from "@/components/products/ProductCard";
import ProductFormDialog from "@/components/products/ProductFormDialog";
import { ProductFilters } from "@/components/products/ProductFilters";
import ProductTable from "@/components/products/ProductTable";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Product } from "@/types/product";
import { cn } from "@/lib/utils";
import {
  Table,
  Grid3X3,
  Plus,
  ArrowLeft,
} from "lucide-react";
import Paginate from "@/components/ui/paginate";
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
import { PermissionGuard } from "@/components/auth/PermissionGuard";

const tablePageSizes = [5, 10, 20, 40];
const cardPageSizes = [8, 12, 24, 48];
const ProductCategoryPage = () => {
  const params = useParams();
  const categoryId = Number(params?.id ?? 0);
  const { filteredCategories, isLoading: categoriesLoading } = useCategories();
  const category = filteredCategories.find((cat) => cat.id === categoryId);

  // Llamar a useProducts ANTES de cualquier return condicional
  const {
    products,
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    activateProduct,
    deactivateProduct,
    reorderProducts,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
  } = useProducts(categoryId);

  // TODOS los hooks deben ir ANTES de cualquier return condicional
  const [openDialog, setOpenDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showTableView, setShowTableView] = useState(true);
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(tablePageSizes[0]);
  const [pageCards, setPageCards] = useState(1);
  const [pageSizeCards, setPageSizeCards] = useState(cardPageSizes[0]);
  const [localProductsCards, setLocalProductsCards] = useState<Product[]>([]);

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

  // TODOS los useMemo también deben ir ANTES de cualquier return condicional
  const filteredProducts = useMemo(() => {
    let result = products;
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.code.toLowerCase().includes(term)
      );
    }
    if (filterStatus !== null) {
      result = result.filter((p) => p.status === filterStatus);
    }
    return result;
  }, [products, searchTerm, filterStatus, isLoading]);

  // Actualizar localProductsCards cuando filteredProducts cambia
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

  const handleDragEndCards = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localProductsCards.findIndex((p) => p.id === active.id);
      const newIndex = localProductsCards.findIndex((p) => p.id === over.id);

      const newProducts = arrayMove(localProductsCards, oldIndex, newIndex);
      setLocalProductsCards(newProducts);

      // Llamar al callback de reordenamiento
      reorderProducts(newProducts);
    }
  };



  // Si las categorías están cargando o no hay categorías cargadas, mostrar loading
  if (categoriesLoading || filteredCategories.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10">
        <div className="text-center text-gray-500 text-sm sm:text-base">
          Cargando categoría...
        </div>
      </div>
    );
  }

  // Si no se encuentra la categoría, mostrar un mensaje
  if (!category && categoryId > 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10">
        <div className="text-center text-gray-500 text-sm sm:text-base">
          Categoría no encontrada. ID: {categoryId}
        </div>
      </div>
    );
  }

  // Si categoryId es 0, mostrar un mensaje
  if (categoryId === 0) {
    console.error('🔗 Category ID es 0');
    return (
      <div className="p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10">
        <div className="text-center text-gray-500 text-sm sm:text-base">
          ID de categoría inválido
        </div>
      </div>
    );
  }

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterStatus(null);
    setPage(1);
    setPageCards(1);
  };
  const handleCreate = async (form: FormData) => {
    await createProduct(form);
    setOpenDialog(false);
  };
  const handleEdit = (product: Product) => {
    setEditProduct(product);
    setOpenDialog(true);
  };
  const handleUpdate = async (form: FormData) => {
    await updateProduct(form);
    setEditProduct(null);
    setOpenDialog(false);
  };
  const handleDelete = async (product: Product) => {
    await deleteProduct(product.id);
  };
  const handleActivate = async (product: Product) => {
    await activateProduct(product.id);
  };
  const handleDeactivate = async (product: Product) => {
    await deactivateProduct(product.id);
  };

  return (
    <PermissionGuard module="productos" action="listar_categoria">
      <div className="p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              Productos de la categoría {category?.name}
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Gestiona los productos de esta categoría.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-center">
            {/* Solo mostrar botón de vista en desktop */}
            <div className="hidden sm:flex gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "flex items-center gap-2 rounded-full hover:scale-105 transition-all duration-200 text-xs sm:text-sm",
                  showTableView
                    ? "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
                    : "hover:bg-gray-100"
                )}
                onClick={() => setShowTableView(!showTableView)}
              >
                {showTableView ? (
                  <>
                    <Table className="w-3 h-3 sm:w-4 sm:h-4" />
                    Tabla
                  </>
                ) : (
                  <>
                    <Grid3X3 className="w-3 h-3 sm:w-4 sm:h-4" />
                    Cards
                  </>
                )}
              </Button>
            </div>
            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                className="whitespace-nowrap inline-flex items-center hover:bg-black hover:text-white rounded-full hover:scale-105 transition-all duration-200 text-xs sm:text-sm w-full sm:w-auto"
                onClick={() => router.push("/products")}
              >
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Atrás
              </Button>
              <PermissionGuard module="productos" action="crear_categoria" fallback={null}>
                <Button
                  size="sm"
                  variant="outline"
                  className="whitespace-nowrap inline-flex items-center bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-xs sm:text-sm w-full sm:w-auto"
                  onClick={() => {
                    setEditProduct(null);
                    setOpenDialog(true);
                  }}
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Nuevo Producto
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
        viewMode={showTableView ? "table" : "cards"}
      />

      {/* Vista de tabla solo en desktop */}
      <div className="hidden lg:block">
        {showTableView ? (
          <>
            <div className="overflow-x-auto">
              <ProductTable
                products={paginatedProducts}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onActivate={handleActivate}
                onDeactivate={handleDeactivate}
                onReorder={reorderProducts}
                isLoading={isLoading}
                currentPage={page}
                pageSize={pageSize}
              />
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center mt-4 sm:mt-6">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {paginatedProductsCards.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onActivate={handleActivate}
                      onDeactivate={handleDeactivate}
                      isDraggable={true}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {totalPagesCards > 1 && (
              <div className="flex justify-center mt-4 sm:mt-6">
                <Paginate
                  page={pageCards}
                  totalPages={totalPagesCards}
                  setPage={setPageCards}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Vista de cards siempre en móvil */}
      <div className="lg:hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEndCards}
        >
          <SortableContext
            items={paginatedProductsCards.map(p => p.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {paginatedProductsCards.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onActivate={handleActivate}
                  onDeactivate={handleDeactivate}
                  isDraggable={true}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        {totalPagesCards > 1 && (
          <div className="flex justify-center mt-4 sm:mt-6">
            <Paginate
              page={pageCards}
              totalPages={totalPagesCards}
              setPage={setPageCards}
            />
          </div>
        )}
      </div>

      <ProductFormDialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setEditProduct(null);
        }}
        onSubmit={editProduct ? handleUpdate : handleCreate}
        initialValues={editProduct}
        categoryId={categoryId}
        isLoading={isLoading}
      />
    </div>
  </PermissionGuard>
  );
};

export default ProductCategoryPage;
