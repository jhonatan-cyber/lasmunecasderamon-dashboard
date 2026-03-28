import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/ui/SearchInput";
import SelectElements from "@/components/ui/select-elements";
import { Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

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
              value={pageSize}
              onChange={handlePageSizeChange}
              options={[5, 10, 20, 50]}
              label="Pedidos por página"
            />
          </div>

          {/* Botón limpiar filtros */}
          <div className="w-full lg:w-auto">
            <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
              onClick={onClearFilters}
              variant="outline"
              size="icon"
              className="w-10 h-10 flex items-center justify-center rounded-2xl border-gray-200 dark:border-gray-800 hover:scale-110 transition-all duration-200 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black shadow-sm"
              
            >
              <Trash2 className="w-4 h-4" />
            </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-black text-white dark:bg-white dark:text-black rounded-xl border-none text-xs font-bold px-3 py-1.5 shadow-xl">
                <p>Limpiar filtros</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}