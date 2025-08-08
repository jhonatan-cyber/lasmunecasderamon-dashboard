import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/ui/SearchInput";
import { Eraser } from "lucide-react";
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
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          {/* Búsqueda */}
          <div className="w-full lg:w-1/3">
            <Label htmlFor="search" className="mb-2 text-sm">
              Buscar
            </Label>
            <SearchInput
              id="search"
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por nombre..."
              className="w-full text-sm"
            />
          </div>

          {/* Filtro de estado */}
          <div className="w-full lg:w-auto">
            <Label htmlFor="status" className="mb-2 text-sm">
              Estados
            </Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger
                id="status"
                className="w-full lg:w-[140px] text-sm rounded-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="1">Activas</SelectItem>
                <SelectItem value="0">Inactivas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Elementos por página */}
          <div className="w-full lg:w-auto">
            <SelectElements
              rowsPerPage={pageSize}
              setRowsPerPage={setPageSize}
              setPage={setPage}
              options={[6, 12, 24, 48]}
              label="Categorías por página"
            />
          </div>

          {/* Botón limpiar filtros */}
          <div className="w-full lg:w-auto">
            <Button
              onClick={onClearFilters}
              size="sm"
              variant="outline"
              className="w-full lg:w-auto rounded-full px-4 text-sm"
            >
              <Eraser className="w-3 h-3 mr-1" />
              Limpiar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
