import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faBroom } from "@fortawesome/free-solid-svg-icons";

interface SalesFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterMetodoPago: string;
  setFilterMetodoPago: (method: string) => void;
  onClearFilters: () => void;
  rowsPerPage: number;
  setRowsPerPage: (value: number) => void;
  setPage: (value: number) => void;
}

export function SalesFilters({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  filterMetodoPago,
  setFilterMetodoPago,
  onClearFilters,
  rowsPerPage,
  setRowsPerPage,
  setPage,
}: SalesFiltersProps) {
  return (
    <Card className='shadow-sm'>
      <CardContent className="mt-3 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Búsqueda - Ocupa todo el ancho en móviles */}
          <div className="w-full">
            <Label htmlFor="search" className="mb-2 text-sm sm:text-base">
              Buscar
            </Label>
            <div className="relative">
              <Input
                id="search"
                type="text"
                placeholder="Buscar por código, cliente, habitación o anfitriona..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm sm:text-base"
              />
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none w-3 h-3 sm:w-4 sm:h-4"
              />
            </div>
          </div>

          {/* Filtros y controles - Responsive layout */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-end">
            {/* Estados */}
            <div className="flex-1 sm:flex-none">
              <Label htmlFor="list" className="mb-2 text-sm sm:text-base">
                Estados
              </Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="status" className="w-full sm:w-[180px] rounded-full text-sm sm:text-base">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="1">Vendido</SelectItem>
                  <SelectItem value="2">Pendiente de anulación</SelectItem>
                  <SelectItem value="0">Anulado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Listado por página */}
            <div className="flex-1 sm:flex-none">
              <Label htmlFor="list" className="mb-2 text-sm sm:text-base">
                Listado
              </Label>
              <Select
                value={String(rowsPerPage)}
                onValueChange={(v) => {
                  setRowsPerPage(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger id="rowsPerPage" className="w-full sm:w-[180px] rounded-full text-sm sm:text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Listar 5 elementos</SelectItem>
                  <SelectItem value="10">Listar 10 elementos</SelectItem>
                  <SelectItem value="20">Listar 20 elementos</SelectItem>
                  <SelectItem value="40">Listar 40 elementos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Método de pago */}
            <div className="flex-1 sm:flex-none">
              <Label htmlFor="payment" className="mb-2 text-sm sm:text-base">
                Método de pago
              </Label>
              <Select
                value={filterMetodoPago}
                onValueChange={setFilterMetodoPago}
              >
                <SelectTrigger id="payment" className="w-full sm:w-[180px] rounded-full text-sm sm:text-base">
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los métodos</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
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
