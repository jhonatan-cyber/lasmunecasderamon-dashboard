"use client";
import React from "react";
import { useCategories, Category } from "@/hooks/useCategories";
import { useRouter } from "next/navigation";
import CategoryCard from "@/components/products/CategoryCard";

const ProductsPage = () => {
  const { filteredCategories, isLoading } = useCategories();
  const router = useRouter();

  const activeCategories = (filteredCategories as Category[]).filter((cat) => cat.status === 1);

  const handleCategoryClick = (categoryId: number) => {
    router.push(`/products/category/${categoryId}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm sm:text-base text-gray-600">Selecciona una categoría para ver sus productos</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-500 text-sm sm:text-base">Cargando categorías...</div>
      ) : activeCategories.length === 0 ? (
        <div className="text-center text-gray-500 text-sm sm:text-base">
          No hay categorías activas disponibles.
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {activeCategories.map((category: Category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onClick={() => handleCategoryClick(category.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductsPage; 