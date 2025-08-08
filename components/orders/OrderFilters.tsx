import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/ui/SearchInput";
import SelectElements from "@/components/ui/select-elements";
import { Eraser } from "lucide-react";

interface OrderFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  setPage: (page: number) => void;
  onClearFilters: () => void;
}

export function OrderFilters({
  searchTerm,
  setSearchTerm,
  pageSize,
  setPageSize,
  setPage,
  onClearFilters,
}: OrderFiltersProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="mt-3 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          {/* Búsqueda */}
          <div className="w-full lg:w-1/2">
            <Label htmlFor="search" className="mb-2 text-sm">
              Buscar
            </Label>
            <SearchInput
              id="search"
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por código, garzón, cliente..."
              className="w-full text-sm"
            />
          </div>

          {/* Elementos por página */}
          <div className="w-full lg:w-auto">
            <SelectElements
              rowsPerPage={pageSize}
              setRowsPerPage={setPageSize}
              setPage={setPage}
              options={[5, 10, 20, 50]}
              label="Pedidos por página"
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