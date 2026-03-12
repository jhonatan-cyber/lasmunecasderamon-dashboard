import { memo, useCallback, useRef } from 'react';
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
  capitalize?: boolean;
}

/**
 * Capitaliza cada palabra: primera letra mayúscula, resto minúscula.
 * Se aplica en tiempo real mientras el usuario escribe.
 */
function capitalizeWords(text: string): string {
  return text.replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\B\w/g, (char) => char.toLowerCase());
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
  onChange,
  capitalize = false
}: FormFieldWithIconProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCapitalizeChange = useCallback(
    (fieldOnChange: (...event: any[]) => void) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target;
        const cursorPos = input.selectionStart ?? input.value.length;
        const capitalized = capitalizeWords(input.value);
        fieldOnChange(capitalized);

        // Restaurar posición del cursor después del render
        requestAnimationFrame(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(cursorPos, cursorPos);
          }
        });
      },
    []
  );

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const { ref: fieldRef, ...fieldRest } = field;
        return (
          <FormItem>
            <FormLabel className='text-sm sm:text-base'>{label}</FormLabel>
            <div className='relative'>
              <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600'>
                <Icon className='w-3 h-3 sm:w-4 sm:h-4' />
              </span>
              <FormControl>
                <Input
                  ref={(el) => {
                    if (capitalize) {
                      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
                    }
                    if (typeof fieldRef === 'function') {
                      fieldRef(el);
                    }
                  }}
                  className='pl-10 sm:pl-12 text-sm sm:text-base'
                  placeholder={placeholder}
                  type={type}
                  inputMode={inputMode}
                  {...(value !== undefined
                    ? { value, onChange }
                    : capitalize
                      ? { ...fieldRest, onChange: handleCapitalizeChange(field.onChange) }
                      : fieldRest)}
                />
              </FormControl>
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

export const FormFieldWithIcon = memo(FormFieldWithIconComponent) as typeof FormFieldWithIconComponent;
