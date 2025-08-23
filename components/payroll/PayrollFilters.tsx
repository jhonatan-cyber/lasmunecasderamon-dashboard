"use client";

import SearchInput from "@/components/ui/SearchInput";
import SelectElements from "@/components/ui/select-elements";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

interface PayrollFiltersProps {
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  rowsPerPage: number;
  setRowsPerPage: (n: number) => void;
  setPage: (n: number) => void;
  onClear?: () => void;
}

export default function PayrollFilters({
  searchTerm,
  setSearchTerm,
  rowsPerPage,
  setRowsPerPage,
  setPage,
  onClear,
}: PayrollFiltersProps) {
  const handleRowsPerPageChange = (value: number) => {
    setRowsPerPage(value);
    setPage(1);
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="mt-3 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="w-full lg:w-1/3">
            <label htmlFor="payroll-search" className="mb-2 text-sm block">Buscar</label>
            <SearchInput
              id="payroll-search"
              value={searchTerm}
              onChange={(v) => {
                setSearchTerm(v);
                setPage(1);
              }}
              placeholder="Buscar por nombre..."
              className="w-full text-sm"
            />
          </div>
          <div className="w-full lg:w-auto">
            <SelectElements
              value={rowsPerPage}
              onChange={handleRowsPerPageChange}
              options={[5, 10, 20, 40]}
              label="Registros por página"
            />
          </div>
          <div className="w-full lg:w-auto">
            <Button
              onClick={onClear}
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


