import { Label } from "@/components/ui/label";
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
      <select
        id="rowsPerPage"
        value={String(effectiveValue)}
        onChange={(e) => effectiveOnChange(Number(e.target.value))}
        className="flex h-10 w-[180px] rounded-full border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-center"
      >
        {options.map((option, index) => {
          const optionValue = typeof option === 'object' ? option.value : option;
          const optionLabel = typeof option === 'object' ? option.label : `Listar ${option} elementos`;
          return (
            <option key={String(optionValue)} value={String(optionValue)}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </div>
  );
};

export default SelectElements;
