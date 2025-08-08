import { Card } from "@/components/ui/card";
import { Wine, ChevronLeft, ChevronRight } from "lucide-react";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface Category {
  id_categoria?: number;
  id?: number;
  nombre?: string;
  name?: string;
  estado?: number;
  productCount?: number;
}

interface CategoryCardListProps {
  categorias: Category[];
  onSelect: (categoria: Category) => void;
  center?: boolean;
  filter?: (categoria: Category) => boolean;
  icon?: React.ReactNode;
  className?: string;
}

const CategoryCardList: React.FC<CategoryCardListProps> = ({
  categorias = [],
  onSelect,
  center = false,
  filter,
  icon,
  className = "",
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  const categoriasFiltradas = filter
    ? categorias.filter(filter)
    : categorias;

  const totalPages = Math.ceil(categoriasFiltradas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCategorias = categoriasFiltradas.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  return (
    <div className={`${className}`}>
      {/* Grid de categorías */}
      <div className="grid grid-cols-4 gap-6 justify-center">
        {currentCategorias.map((cat, index) => (
          <Card
            key={cat?.id_categoria || cat?.id || `categoria-${index}`}
            className="flex flex-col items-center justify-center w-full h-28 border-dashed border-2 border-gray-200 bg-gray-50 shadow-none hover:border-gray-400 cursor-pointer transition-all duration-200 hover:scale-105"
            onClick={() => onSelect(cat)}
          >
            <div className="text-3xl mb-2 text-gray-600">
              {icon || <Wine className="w-8 h-8" />}
            </div>
            <div className="text-center font-semibold text-gray-700 text-sm">
              {cat?.nombre || cat?.name || "Sin nombre"}
            </div>
          </Card>
        ))}
      </div>

      {/* Mensaje cuando no hay categorías */}
      {categoriasFiltradas.length === 0 && (
        <div className="text-center w-full py-8">
          <div className="text-gray-400">No hay categorías disponibles</div>
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-3 h-3" />
            Anterior
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Página {currentPage} de {totalPages}
            </span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="flex items-center gap-2"
          >
            Siguiente
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default CategoryCardList; 