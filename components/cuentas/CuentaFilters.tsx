"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faRefresh } from "@fortawesome/free-solid-svg-icons";

interface CuentaFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  rowsPerPage: number;
  setRowsPerPage: (rows: number) => void;
  setPage: (page: number) => void;
  loading: boolean;
  onRefresh: () => void;
}

export default function CuentaFilters({
  searchTerm,
  setSearchTerm,
  rowsPerPage,
  setRowsPerPage,
  setPage,
  loading,
  onRefresh,
}: CuentaFiltersProps) {
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1); // Reset to first page when searching
  };

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setPage(1); // Reset to first page when changing rows per page
  };

  return (
    <Card className='shadow-sm'>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Búsqueda - Ocupa todo el ancho en móviles */}
          <div className="w-full">
            <Label htmlFor="search" className="mb-2 text-sm sm:text-base">
              Buscar
            </Label>
            <div className="relative">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm sm:text-base"
              />
              <Input
                id="search"
                placeholder="Buscar por cliente o código..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 text-sm sm:text-base"
                disabled={loading}
              />
            </div>
          </div>

          {/* Filtros y controles - Responsive layout */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-end">
            {/* Listado por página */}
            <div className="flex-1 sm:flex-none">
              <Label htmlFor="rowsPerPage" className="mb-2 text-sm sm:text-base">
                Listado
              </Label>
              <Select value={rowsPerPage.toString()} onValueChange={handleRowsPerPageChange}>
                <SelectTrigger id="rowsPerPage" className="w-full sm:w-[180px] rounded-full text-sm sm:text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Listar 5 elementos</SelectItem>
                  <SelectItem value="10">Listar 10 elementos</SelectItem>
                  <SelectItem value="20">Listar 20 elementos</SelectItem>
                  <SelectItem value="50">Listar 50 elementos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botón actualizar */}
            <div className="flex-1 sm:flex-none">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="w-full sm:w-auto rounded-full px-4 sm:px-6 py-2 hover:scale-105 transition-all duration-200 text-sm sm:text-base"
              >
                <FontAwesomeIcon 
                  icon={faRefresh} 
                  className={`mr-2 ${loading ? "animate-spin" : ""}`} 
                />
                {loading ? "Cargando..." : "Actualizar"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 