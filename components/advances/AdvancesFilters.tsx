import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import SelectElements from "@/components/ui/select-elements";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

interface AdvancesFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  rowsPerPage: number;
  setRowsPerPage: (size: number) => void;
  setPage: (page: number) => void;
  filterStatus?: string;
  setFilterStatus?: (v: string) => void;
  filterAnfitriona?: string;
  setFilterAnfitriona?: (v: string) => void;
  onClearFilters?: () => void;
}

export default function AdvancesFilters({
  searchTerm,
  setSearchTerm,
  rowsPerPage,
  setRowsPerPage,
  setPage,
  onClearFilters
}: AdvancesFiltersProps) {
  const handleClear = () => {
    if (onClearFilters) {
      onClearFilters();
    } else {
      setSearchTerm("");
      setPage(1);
    }
  };

  const handleRowsPerPageChange = (value: number) => {
    setRowsPerPage(value);
    setPage(1);
  };

  return (
    <Card className="mb-4 sm:mb-6 shadow-sm">
      <CardContent className="mt-3 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Búsqueda - Ocupa todo el ancho en móviles */}
          <div className="w-full">
            <Label htmlFor="search" className="mb-2 text-sm sm:text-base">
              Buscar
            </Label>
            <Input
              id="search"
              placeholder="Buscar por usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm sm:text-base"
            />
          </div>

          {/* Filtros y controles - Responsive layout */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-end justify-center">
            {/* Anticipos por página */}
            <div className="flex-1 sm:flex-none sm:w-auto">
              <SelectElements
                value={rowsPerPage}
                onChange={handleRowsPerPageChange}
                options={[5, 10, 20, 40]}
                label="Anticipos por página"
              />
            </div>

            {/* Botón limpiar filtros */}
            <div className="flex-1 sm:flex-none sm:w-auto">
              <Button
                onClick={handleClear}
                size="sm"
                variant="outline"
                className="w-full sm:w-auto rounded-full px-4 sm:px-6 py-2 hover:scale-105 transition-all duration-200 text-sm sm:text-base"
              >
                              <Eraser className="mr-2" />
              Limpiar 
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}