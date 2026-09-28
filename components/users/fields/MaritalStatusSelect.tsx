'use client';

import React from 'react';
import { Control, Controller } from 'react-hook-form';
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { SELECT_TRIGGER_CLASS } from '@/components/shared/selectStyles';

interface MaritalStatusSelectProps {
  control: Control<any>;
  name: string;
  label?: string;
  placeholder?: string;
}

const MARITAL_STATUSES = [
  { value: 'Soltero', label: 'Soltero/a' },
  { value: 'Casado', label: 'Casado/a' },
  { value: 'Divorciado', label: 'Divorciado/a' },
  { value: 'Viudo', label: 'Viudo/a' },
  { value: 'Separado', label: 'Separado/a' }
] as const;

export function MaritalStatusSelect({
  control,
  name,
  label = 'Estado Civil',
  placeholder = 'Seleccione estado civil'
}: MaritalStatusSelectProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormItem>
          <FormLabel className='text-sm sm:text-base'>{label}</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {MARITAL_STATUSES.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default MaritalStatusSelect;
