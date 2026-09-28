import { memo } from 'react';
import { Control } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LucideIcon } from 'lucide-react';
import { type UserFormValues } from '@/hooks/personal';

interface NumberInputFieldProps {
  control: Control<UserFormValues>;
  name: keyof UserFormValues;
  label: string;
  icon: LucideIcon;
  formattedValue: string;
  onValueChange: (value: string, onChange: (value: number) => void) => void;
  disabled?: boolean;
}

function NumberInputFieldComponent({
  control,
  name,
  label,
  icon: Icon,
  formattedValue,
  onValueChange,
  disabled = false
}: NumberInputFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className={disabled ? 'text-muted-foreground' : undefined}>{label}</FormLabel>
          <div className='relative'>
            <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600'>
              <Icon />
            </span>
            <FormControl>
              <Input
                className='pl-12'
                type='text'
                value={formattedValue}
                onChange={e => onValueChange(e.target.value, field.onChange)}
                placeholder='0'
                inputMode='numeric'
                disabled={disabled}
              />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export const NumberInputField = memo(NumberInputFieldComponent);
