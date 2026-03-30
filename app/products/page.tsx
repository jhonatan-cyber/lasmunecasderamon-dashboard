"use client";
import { useCategories, Category } from "@/hooks/productos/useCategories";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { ProductsSkeleton } from "@/components/shared/Skeletons";
import CategoryCard from "@/components/products/CategoryCard";
import { useRouter } from "next/navigation";

const ProductsPage = () => {
  const router = useRouter();
  const { filteredCategories, isLoading: categoriesLoading } = useCategories();
  const activeCategories = (filteredCategories as Category[]).filter((cat) => cat.status === 1);

  const handleCategoryClick = (categoryId: string) => {
    router.push(`/products/category/${categoryId}`);
  };

  if (categoriesLoading) return <ProductsSkeleton />;

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
};

export default ProductsPage; 