import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/ui/SearchInput";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBroom } from "@fortawesome/free-solid-svg-icons";
import SelectElements from "@/components/ui/select-elements";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CategoryFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  onClearFilters: () => void;
  pageSize: number;
  setPageSize: (value: number) => void;
  setPage: (value: number) => void;
}

export function CategoryFilters({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  onClearFilters,
  pageSize,
  setPageSize,
  setPage,
}: CategoryFiltersProps) {
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
              placeholder="Buscar por nombre..."
              className="w-full text-sm sm:text-base"
            />
          </div>

          {/* Filtros y controles - Responsive layout */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-end">
            {/* Filtro de estado */}
            <div className="flex-1 sm:flex-none">
              <Label htmlFor="status" className="mb-2 text-sm sm:text-base">
                Estados
              </Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger
                  id="status"
                  className="w-full sm:w-[180px] text-center rounded-full text-sm sm:text-base"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-sm sm:text-base">Todos los estados</SelectItem>
                  <SelectItem value="1" className="text-sm sm:text-base">Activas</SelectItem>
                  <SelectItem value="0" className="text-sm sm:text-base">Inactivas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Elementos por página */}
            <div className="flex-1 sm:flex-none">
              <SelectElements
                rowsPerPage={pageSize}
                setRowsPerPage={setPageSize}
                setPage={setPage}
                options={[6, 12, 24, 48]}
                label="Categorías por página"
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
