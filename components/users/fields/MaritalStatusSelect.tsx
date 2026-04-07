'use client';

import React from 'react';
import { Control, Controller } from 'react-hook-form';
import { UserCheck } from 'lucide-react';
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

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
          <div className='relative'>
            <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400'>
              <UserCheck className='w-4 h-4' />
            </span>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className='pl-12 rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 h-10 w-full'>
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
              </FormControl>
              <SelectContent className='rounded-xl border-gray-200 dark:border-gray-700'>
                {MARITAL_STATUSES.map((status) => (
                  <SelectItem
                    key={status.value}
                    value={status.value}
                    className='rounded-full'
                  >
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default MaritalStatusSelect;
