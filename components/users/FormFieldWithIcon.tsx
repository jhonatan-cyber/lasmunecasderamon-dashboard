import { memo } from 'react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LucideIcon } from 'lucide-react';

interface FormFieldWithIconProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder: string;
  icon: LucideIcon;
  type?: string;
  inputMode?: 'text' | 'numeric';
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function FormFieldWithIconComponent<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  icon: Icon,
  type = 'text',
  inputMode = 'text',
  value,
  onChange
}: FormFieldWithIconProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className='text-sm sm:text-base'>{label}</FormLabel>
          <div className='relative'>
            <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600'>
              <Icon className='w-3 h-3 sm:w-4 sm:h-4' />
            </span>
            <FormControl>
              <Input
                className='pl-10 sm:pl-12 text-sm sm:text-base'
                placeholder={placeholder}
                type={type}
                inputMode={inputMode}
                {...(value !== undefined ? { value, onChange } : field)}
              />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export const FormFieldWithIcon = memo(FormFieldWithIconComponent) as typeof FormFieldWithIconComponent;
