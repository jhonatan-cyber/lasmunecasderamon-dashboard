'use client';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { OptionSelect, type OptionSelectProps } from './OptionSelect';
const options = [
  {
    value: 'presente',
    label: 'Presente',
    icon: <CheckCircle className='h-4 w-4 text-green-500' />
  },
  {
    value: 'tardanza',
    label: 'Tardanza',
    icon: <AlertCircle className='h-4 w-4 text-yellow-500' />
  },
  { value: 'ausente', label: 'Ausente', icon: <XCircle className='h-4 w-4 text-red-500' /> }
];
export default function AttendanceStatusSelect({
  label = 'Estado',
  placeholder = 'Selecciona un estado',
  ...props
}: Omit<OptionSelectProps, 'options' | 'icon'>) {
  return <OptionSelect {...props} label={label} placeholder={placeholder} options={options} />;
}
