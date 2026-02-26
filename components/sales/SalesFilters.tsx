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

import { Search, Eraser } from "lucide-react";

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
        <div className="flex flex-col gap-4">
          {/* Búsqueda */}
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>

          {/* Filtros y controles - Responsive */}
          <div className="flex flex-col lg:flex-row gap-4 items-end lg:justify-center">
            {/* Estados */}
            <div className="w-full lg:w-[160px]">
              <Label htmlFor="list" className="mb-2 text-sm sm:text-base">
                Estados
              </Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="status" className="w-full rounded-full text-sm sm:text-base">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="1">Completado</SelectItem>
                  <SelectItem value="2">En Proceso</SelectItem>
                  <SelectItem value="3">Pdte. Anulación</SelectItem>
                  <SelectItem value="0">Anulado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Listado por página */}
            <div className="w-full lg:w-[160px]">
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
                <SelectTrigger id="rowsPerPage" className="w-full rounded-full text-sm sm:text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 elementos</SelectItem>
                  <SelectItem value="10">10 elementos</SelectItem>
                  <SelectItem value="20">20 elementos</SelectItem>
                  <SelectItem value="40">40 elementos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Método de pago */}
            <div className="w-full lg:w-[160px]">
              <Label htmlFor="payment" className="mb-2 text-sm sm:text-base">
                Método
              </Label>
              <Select
                value={filterMetodoPago}
                onValueChange={setFilterMetodoPago}
              >
                <SelectTrigger id="payment" className="w-full rounded-full text-sm sm:text-base">
                  <SelectValue placeholder="Método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botón limpiar filtros */}
            <div className="w-full lg:w-auto">
              <Button
                onClick={onClearFilters}
                size="sm"
                variant="outline"
                className="w-full lg:w-auto rounded-full px-4 sm:px-6 py-2 hover:scale-105 transition-all duration-200 text-sm sm:text-base"
              >
                <Eraser className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Limpiar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
