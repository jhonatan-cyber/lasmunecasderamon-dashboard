 
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/ui/SearchInput";
import SelectElements from "@/components/ui/select-elements";

interface CommissionsFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onClearFilters: () => void;
  rowsPerPage: number;
  setRowsPerPage: (value: number) => void;
  setPage: (value: number) => void;
}

export function CommissionsFilters({
  searchTerm,
  setSearchTerm,
  onClearFilters,
  rowsPerPage,
  setRowsPerPage,
  setPage,
}: CommissionsFiltersProps) {
  const handleRowsPerPageChange = (value: number) => {
    setRowsPerPage(value);
    setPage(1);
  };

  const hasActiveFilters = searchTerm.trim() !== "" || rowsPerPage !== 5;

  return (
    <Card className="shadow-sm">
      <CardContent className="mt-3 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          {/* Búsqueda */}
          <div className="flex-1">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por empleado o nick..."
              className="w-full text-sm sm:text-base"
            />
          </div>

          {/* Elementos por página */}
          <div className="w-full sm:w-auto">
            <SelectElements
              value={rowsPerPage}
              onChange={handleRowsPerPageChange}
              options={[5, 10, 20, 40]}
            />
          </div>

          {/* Botón limpiar filtros - solo aparece cuando hay filtros activos */}
          {hasActiveFilters && (
            <Button
              onClick={onClearFilters}
              size="sm"
              variant="outline"
              className="w-full sm:w-auto rounded-full px-4 sm:px-6 py-2 hover:scale-105 transition-all duration-200 text-sm sm:text-base"
            >
              Limpiar 
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
