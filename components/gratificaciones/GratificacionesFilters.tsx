 
"use client";

import SearchInput from "@/components/shared/SearchInput";
import SelectElements from "@/components/shared/SelectElements";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

interface GratificacionesFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  rowsPerPage: number;
  setRowsPerPage: (size: number) => void;
  setPage: (page: number) => void;
  loading: boolean;
  onRefresh: () => void;
}

export default function GratificacionesFilters({
  searchTerm,
  setSearchTerm,
  rowsPerPage,
  setRowsPerPage,
  setPage,
  loading,
  onRefresh,
}: GratificacionesFiltersProps) {
  
  const handleRowsPerPageChange = (value: number) => {
    setRowsPerPage(value);
    setPage(1);
  };

  return (
    <Card className="mb-6 overflow-hidden border-none shadow-sm shadow-zinc-200 dark:shadow-neutral-900 bg-white dark:bg-neutral-900 border border-zinc-100 dark:border-neutral-800">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          {/* Campo de Búsqueda */}
          <div className="w-full lg:flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-zinc-400" />
              <Label htmlFor="search" className="text-sm font-bold uppercase tracking-widest text-zinc-500">
                Buscador Inteligente
              </Label>
            </div>
            <SearchInput
              placeholder="Buscar por nombre de usuario o ID..."
              value={searchTerm}
              onChange={setSearchTerm}
              className="w-full h-11 rounded-full bg-zinc-50 dark:bg-neutral-800 border-none transition-all focus:ring-2 focus:ring-black text-sm"
            />
          </div>

          <div className="flex flex-row w-full lg:w-auto gap-4 items-center">
            {/* Selector de filas */}
            <div className="space-y-2 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Label htmlFor="rows" className="text-[10px] font-bold uppercase tracking-tighter text-zinc-400">
                  Registros
                </Label>
              </div>
              <SelectElements
                value={rowsPerPage}
                onChange={handleRowsPerPageChange}
                options={[10, 20, 50, 100]}
                label=""
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
