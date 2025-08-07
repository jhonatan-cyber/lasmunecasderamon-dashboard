import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Card, CardContent } from "@/components/ui/card";

interface CajaFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterStatus: string;
  onStatusChange: (value: string) => void;
  onClearFilters: () => void;
}

export const CajaFilters = ({
  searchTerm,
  onSearchChange,
  filterStatus,
  onStatusChange,
  onClearFilters,
}: CajaFiltersProps) => {
  const hasActiveFilters = searchTerm || filterStatus !== "all";

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
            />
            <Input
              placeholder="Buscar cajas..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 text-sm sm:text-base"
            />
          </div>

          {/* Filtro de estado */}
          <div className="flex-1 sm:flex-none">
            <Select value={filterStatus} onValueChange={onStatusChange}>
              <SelectTrigger className="w-full sm:w-[180px] text-center rounded-full text-sm sm:text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem className="text-center text-sm sm:text-base" value="all">
                  Todos los estados
                </SelectItem>
                <SelectItem className="text-center text-sm sm:text-base" value="1">
                  Abiertas
                </SelectItem>
                <SelectItem className="text-center text-sm sm:text-base" value="0">
                  Cerradas
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botón limpiar filtros */}
          {hasActiveFilters && (
            <div className="flex-1 sm:flex-none">
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="w-full sm:w-auto flex items-center gap-2 rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base px-4 sm:px-6 py-2"
              >
                <FontAwesomeIcon icon={faXmark} className="w-3 h-3 sm:w-4 sm:h-4" />
                Limpiar
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
