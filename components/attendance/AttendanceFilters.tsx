import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SelectElements from "@/components/ui/select-elements";
import Paginate from "@/components/ui/paginate";
import { Eraser, Search } from "lucide-react";

interface AttendanceFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  page: number;
  setPage: (page: number) => void;
  totalItems: number;
  totalPages: number;
  onClearFilters: () => void;
}

export default function AttendanceFilters({
  searchTerm,
  setSearchTerm,
  pageSize,
  setPageSize,
  page,
  setPage,
  totalItems,
  totalPages,
  onClearFilters
}: AttendanceFiltersProps) {
  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Buscador */}
          <div className="flex-1">
            <Label htmlFor="search" className="text-sm font-medium text-gray-700 mb-2 block">
              Buscar
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                type="text"
                placeholder="Buscar por nombre, nick..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 rounded-full"
              />
            </div>
          </div>

          {/* Elementos por página */}
          <div className="w-full sm:w-auto">
            <SelectElements
              value={pageSize}
              onChange={handlePageSizeChange}
              options={[5, 10, 20, 40]}
              label="Asistencias por página"
            />
          </div>

          {/* Botón limpiar filtros */}
          <div className="w-full sm:w-auto flex flex-col justify-end">
            <button
              onClick={onClearFilters}
              className="w-full sm:w-auto px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors inline-flex items-center justify-center gap-2 h-10"
            >
              <Eraser className="w-4 h-4" />
              Limpiar
            </button>
          </div>
        </div>

        {/* Paginador */}
        {totalPages > 1 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>
                Mostrando {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalItems)} de {totalItems} asistencias
              </span>
            </div>
            <Paginate
              page={page}
              totalPages={totalPages}
              setPage={setPage}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
