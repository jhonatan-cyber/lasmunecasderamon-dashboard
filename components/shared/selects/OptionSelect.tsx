'use client';
import { useId, type ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { SELECT_LABEL_CLASS } from '@/components/shared/selectStyles';
export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}
export interface OptionSelectProps {
  id?: string;
  ariaLabel?: string;
  triggerClassName?: string;
  value?: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  label?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}
/** Shared keyboard-accessible selector. Indexed keys also support an empty filter value. */
export function OptionSelect({
  id: providedId,
  ariaLabel,
  triggerClassName,
  value,
  onChange,
  options,
  label,
  placeholder = 'Seleccione una opción',
  className,
  required,
  disabled,
  icon
}: OptionSelectProps) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const index = options.findIndex(option => option.value === value);
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id} className={SELECT_LABEL_CLASS}>
          {label}
          {required && <span className='ml-1 text-red-500'>*</span>}
        </Label>
      )}
      <Select
        value={index < 0 ? '' : String(index)}
        onValueChange={(key: string) => onChange(options[Number(key)].value)}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          aria-required={required}
          aria-label={ariaLabel || label || placeholder}
          className={triggerClassName}
        >
          <span className='flex min-w-0 items-center gap-2'>
            {icon}
            <SelectValue placeholder={placeholder} />
          </span>
        </SelectTrigger>
        <SelectContent>
          {options.length ? (
            options.map((option, optionIndex) => (
              <SelectItem key={option.value} value={String(optionIndex)} disabled={option.disabled}>
                <span className='flex items-center gap-2'>
                  {option.icon}
                  {option.label}
                </span>
              </SelectItem>
            ))
          ) : (
            <p className='p-4 text-sm text-muted-foreground'>No hay opciones disponibles</p>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
