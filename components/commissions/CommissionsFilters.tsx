import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/ui/SearchInput";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBroom } from "@fortawesome/free-solid-svg-icons";
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
  return (
    <Card className="shadow-sm">
      <CardContent className="mt-3 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Búsqueda - Ocupa todo el ancho en móviles */}
          <div className="w-full">
            <Label htmlFor="search" className="mb-2 text-sm sm:text-base">
              Buscar
            </Label>
            <SearchInput
              id="search"
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por empleado o nick..."
              className="w-full text-sm sm:text-base"
            />
          </div>

          {/* Controles - Responsive layout */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-end">
            {/* Elementos por página */}
            <div className="flex-1 sm:flex-none">
              <SelectElements
                rowsPerPage={rowsPerPage}
                setRowsPerPage={setRowsPerPage}
                setPage={setPage}
                options={[5, 10, 20, 40]}
                label="Comisiones por página"
              />
            </div>

            {/* Botón limpiar filtros */}
            <div className="flex-1 sm:flex-none">
              <Button
                onClick={onClearFilters}
                size="sm"
                variant="outline"
                className="w-full sm:w-auto rounded-full px-4 sm:px-6 py-2 hover:scale-105 transition-all duration-200 text-sm sm:text-base"
              >
                <FontAwesomeIcon icon={faBroom} className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
