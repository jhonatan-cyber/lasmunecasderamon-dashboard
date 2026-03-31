'use client';

import React from 'react';
import { Control, UseFormWatch } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { NumberInputField } from '@/components/users/NumberInputField';
import { DollarSign } from 'lucide-react';

import { type UserFormValues } from '@/hooks/personal/useUserForm';

interface HousingDiscountFieldProps {
  control: Control<UserFormValues>;
  watch: UseFormWatch<UserFormValues>;
  discountName: keyof UserFormValues;
  formattedValue: string;
  onValueChange: (value: string, onChange: (value: number) => void) => void;
}

export function HousingDiscountField({
  control,
  watch,
  discountName,
  formattedValue,
  onValueChange
}: HousingDiscountFieldProps) {
  const isDiscountEnabled = watch('housing_discount');

  return (
    <div className='md:col-span-2 space-y-2'>
      <FormField
        control={control}
        name='housing_discount'
        render={({ field }) => (
          <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4 bg-gray-100/50 dark:bg-slate-900/50'>
            <div className='space-y-0.5'>
              <FormLabel className='text-base'>Descuento por Alojamiento</FormLabel>
              <FormDescription>
                Activar si el empleado tiene descuento por alojamiento
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      {isDiscountEnabled && (
        <NumberInputField
          control={control}
          name={discountName}
          label='Monto en Descuento'
          icon={DollarSign}
          formattedValue={formattedValue}
          onValueChange={onValueChange}
        />
      )}
    </div>
  );
}

export default HousingDiscountField;
