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
  value: number;
  onChange: (value: number) => void;
  options?: Array<{ value: string | number; label: string }> | number[];
  label?: string;
}

const SelectElements: React.FC<SelectElementsProps> = (props) => {
  const {
    value,
    onChange,
    options = [5, 10, 20, 40], // Valores por defecto
    label = "Listado"
  } = props;
  
  return (
  <div>
    <Label htmlFor="rowsPerPage" className="mb-1">
      {label}
    </Label>
    <Select
      value={String(value)}
      onValueChange={(v) => onChange(Number(v))}
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
            <SelectItem key={index} className="text-center" value={String(optionValue)}>
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
