'use client';

import React from 'react';
import { Control, Controller, ControllerProps } from 'react-hook-form';
import { Users } from 'lucide-react';
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

interface RoleSelectProps {
  control: Control<any>;
  name: string;
  roles: any[];
  isLoading?: boolean;
  label?: string;
  placeholder?: string;
}

export function RoleSelect({
  control,
  name,
  roles,
  isLoading = false,
  label = 'Rol',
  placeholder = 'Seleccione un rol'
}: RoleSelectProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormItem>
          <FormLabel className='text-sm sm:text-base'>{label}</FormLabel>
          <div className='relative w-full'>
            <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400 pointer-events-none'>
              <Users className='w-4 h-4' />
            </span>
            <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
              <FormControl>
                <SelectTrigger className='w-full pl-12 rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 h-10'>
                  <SelectValue placeholder={isLoading ? 'Cargando roles...' : placeholder} />
                </SelectTrigger>
              </FormControl>
              <SelectContent className='rounded-xl border-gray-200 dark:border-gray-700'>
                {!isLoading && roles && roles.length > 0 ? (
                  roles
                    .filter((role: any) => role.status === 1)
                    .map((role: any) => (
                      <SelectItem key={role.id} value={role.id.toString()} className='rounded-lg'>
                        {role.name}
                      </SelectItem>
                    ))
                ) : (
                  <SelectItem value='no-roles' disabled>
                    {isLoading ? 'Cargando...' : 'No hay roles disponibles'}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default RoleSelect;
