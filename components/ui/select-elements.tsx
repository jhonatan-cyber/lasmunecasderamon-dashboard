import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React from "react";

interface SelectElementsProps {
  rowsPerPage: number;
  setRowsPerPage: (value: number) => void;
  setPage: (value: number) => void;
  options?: number[];
  label?: string;
}

const SelectElements: React.FC<SelectElementsProps> = ({
  rowsPerPage,
  setRowsPerPage,
  setPage,
  options = [5, 10, 20, 40], // Valores por defecto
  label = "Listado"
}) => (
  <div>
    <Label htmlFor="rowsPerPage" className="mb-1">
      {label}
    </Label>
    <Select
      value={String(rowsPerPage)}
      onValueChange={(v) => {
        setRowsPerPage(Number(v));
        setPage(1);
      }}
    >
      <SelectTrigger
        id="rowsPerPage"
        className="w-[180px] text-center rounded-full"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} className="text-center" value={String(option)}>
            Listar {option} elementos
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default SelectElements;
