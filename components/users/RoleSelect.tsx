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
          <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
            <FormControl>
              <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                <SelectValue placeholder={isLoading ? 'Cargando roles...' : placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {!isLoading && roles && roles.length > 0 ? (
                roles
                  .filter((role: any) => role.status === 1)
                  .map((role: any) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
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
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default RoleSelect;
