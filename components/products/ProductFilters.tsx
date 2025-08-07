"use client";

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

interface ProductFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: number | null;
  setFilterStatus: (status: number | null) => void;
  onClearFilters: () => void;
  pageSize: number;
  setPageSize: (value: number) => void;
  setPage: (value: number) => void;
  viewMode: "table" | "cards";
}

export function ProductFilters({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  onClearFilters,
  pageSize,
  setPageSize,
  setPage,
  viewMode,
}: ProductFiltersProps) {
  const tablePageSizes = [5, 10, 20, 40];
  const cardPageSizes = [8, 12, 24, 48];

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
              placeholder="Buscar por nombre o código..."
              className="w-full text-sm sm:text-base"
            />
          </div>

          {/* Controles - Responsive layout */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-end">
            {/* Filtro de estado */}
            <div className="flex-1 sm:flex-none">
              <Label htmlFor="status" className="mb-2 text-sm sm:text-base">
                Estados
              </Label>
              <Select 
                value={filterStatus === null ? "all" : String(filterStatus)} 
                onValueChange={(value) => setFilterStatus(value === "all" ? null : Number(value))}
              >
                <SelectTrigger
                  id="status"
                  className="w-full sm:w-[180px] text-center rounded-full text-sm sm:text-base"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="1">Activos</SelectItem>
                  <SelectItem value="0">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Elementos por página */}
            <div className="flex-1 sm:flex-none">
              <SelectElements
                rowsPerPage={pageSize}
                setRowsPerPage={setPageSize}
                setPage={setPage}
                options={viewMode === "table" ? tablePageSizes : cardPageSizes}
                label={viewMode === "table" ? "Productos por página" : "Productos por página"}
              />
            </div>

            {/* Botón limpiar filtros */}
            <div className="flex-1 sm:flex-none">
              <Button
                onClick={onClearFilters}
                size="sm"
                variant="outline"
                className="w-full sm:w-auto rounded-full px-4 sm:px-6 hover:scale-105 transition-all duration-200 text-sm sm:text-base"
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