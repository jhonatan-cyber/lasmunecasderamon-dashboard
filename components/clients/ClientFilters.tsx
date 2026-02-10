"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eraser } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import SelectElements from "@/components/ui/select-elements";

interface ClientFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: number | null;
  setFilterStatus: (status: number | null) => void;
  onClearFilters: () => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  setPage: (page: number) => void;
}

export function ClientFilters({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  onClearFilters,
  pageSize,
  setPageSize,
  setPage,
}: ClientFiltersProps) {
  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="mt-3 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          {/* Buscador */}
          <div className="w-full lg:w-1/3">
            <Label htmlFor="search" className="mb-2 text-sm">
              Buscar
            </Label>
            <SearchInput
              id="search"
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por nombre, apellido, RUN o teléfono..."
              className="w-full text-sm"
            />
          </div>

          {/* Filtro de estado */}
          <div className="w-full lg:w-auto">
            <Label htmlFor="status" className="mb-2 text-sm">
              Estados
            </Label>
            <Select
              value={filterStatus === null ? "all" : String(filterStatus)}
              onValueChange={(value) => setFilterStatus(value === "all" ? null : Number(value))}
            >
              <SelectTrigger id="status" className="w-full lg:w-[140px] text-sm rounded-full">
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
          <div className="w-full lg:w-auto">
            <SelectElements
              value={pageSize}
              onChange={handlePageSizeChange}
              options={[5, 10, 20, 40]}
              label="Clientes por página"
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
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
