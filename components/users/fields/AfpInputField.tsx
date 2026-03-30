'use client';

import React from 'react';
import { Control, Controller } from 'react-hook-form';
import { Home } from 'lucide-react';
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface AfpInputFieldProps {
  control: Control<any>;
  name: string;
  label?: string;
  placeholder?: string;
}

export function AfpInputField({
  control,
  name,
  label = 'Establecimiento de Aporte',
  placeholder = 'Establecimiento AFP'
}: AfpInputFieldProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormItem>
          <FormLabel className='text-sm sm:text-base'>{label}</FormLabel>
          <div className='relative'>
            <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400'>
              <Home className='w-4 h-4' />
            </span>
            <FormControl>
              <Input
                className='pl-12 rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 h-10'
                placeholder={placeholder}
                {...field}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  field.onChange(value);
                }}
              />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default AfpInputField;
