import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import React from 'react';

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

const SelectElements: React.FC<SelectElementsProps> = props => {
  const {
    value,
    onChange,
    rowsPerPage,
    setRowsPerPage,
    setPage,
    options = [5, 10, 20, 40], // Valores por defecto
    label = 'Listado'
  } = props;

  // Compatibilidad hacia atrás: preferir value/onChange; si no existen, usar rowsPerPage/setRowsPerPage
  const effectiveValue = value ?? rowsPerPage ?? 5;
  const effectiveOnChange = (v: number) => {
    if (onChange) onChange(v);
    if (setRowsPerPage) setRowsPerPage(v);
    if (setPage) setPage(1);
  };

  return (
    <div>
      {label && (
        <Label
          htmlFor='list'
          className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
        >
          {label}
        </Label>
      )}
      <Select
        value={String(effectiveValue)}
        onValueChange={(value: string) => effectiveOnChange(Number(value))}
      >
        <SelectTrigger className='w-[180px] rounded-full text-center text-sm bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className='rounded-xl border-gray-200 dark:border-gray-800'>
          {options.map((option, index) => {
            const optionValue = typeof option === 'object' ? option.value : option;
            const optionLabel = typeof option === 'object' ? option.label : `${option} elementos`;
            return (
              <SelectItem key={String(optionValue)} value={String(optionValue)}>
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
