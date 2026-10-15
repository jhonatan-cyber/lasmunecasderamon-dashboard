'use client';
import { OptionSelect, type OptionSelectProps } from './OptionSelect';
export default function FilterSelect({
  label = 'Filtro',
  ...props
}: Omit<OptionSelectProps, 'required' | 'icon'>) {
  return <OptionSelect label={label} {...props} />;
}
