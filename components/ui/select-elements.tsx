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
  // API A (actual)
  value?: number;
  onChange?: (value: number) => void;
  // API B (legado en algunos componentes)
  rowsPerPage?: number;
  setRowsPerPage?: (value: number) => void;
  setPage?: (page: number) => void;
  options?: Array<{ value: string | number; label: string }> | number[];
  label?: string;
}

const SelectElements: React.FC<SelectElementsProps> = (props) => {
  const {
    value,
    onChange,
    rowsPerPage,
    setRowsPerPage,
    setPage,
    options = [5, 10, 20, 40], // Valores por defecto
    label = "Listado"
  } = props;

  // Compatibilidad hacia atrás: preferir value/onChange; si no existen, usar rowsPerPage/setRowsPerPage
  const effectiveValue = (value ?? rowsPerPage ?? 5);
  const effectiveOnChange = (v: number) => {
    if (onChange) onChange(v);
    if (setRowsPerPage) setRowsPerPage(v);
    if (setPage) setPage(1);
  };
  
  return (
  <div>
    <Label htmlFor="rowsPerPage" className="mb-1">
      {label}
    </Label>
    <Select
      value={String(effectiveValue)}
      onValueChange={(v) => effectiveOnChange(Number(v))}
    >
      <SelectTrigger
        id="rowsPerPage"
        className="w-[180px] text-center rounded-full"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option, index) => {
          const optionValue = typeof option === 'object' ? option.value : option;
          const optionLabel = typeof option === 'object' ? option.label : `Listar ${option} elementos`;
          return (
            <SelectItem key={String(optionValue)} className="text-center" value={String(optionValue)}>
              {optionLabel}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  </div>
  );
};

export default SelectElements;
