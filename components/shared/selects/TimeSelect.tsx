'use client';
import { Clock } from 'lucide-react';
import { OptionSelect, type OptionSelectProps } from './OptionSelect';
const DEFAULT_TIME_OPTIONS = Array.from({ length: 12 }, (_, i) => (i + 1) * 5);
interface TimeSelectProps extends Omit<OptionSelectProps, 'options' | 'icon'> {
  timeOptions?: number[];
}
const formatTime = (minutes: number) =>
  minutes % 60 === 0
    ? `${minutes / 60} horas`
    : minutes < 60
      ? `${minutes} min`
      : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
export default function TimeSelect({
  label = 'Tiempo',
  placeholder = 'Seleccione tiempo',
  timeOptions = DEFAULT_TIME_OPTIONS,
  ...props
}: TimeSelectProps) {
  return (
    <OptionSelect
      {...props}
      label={label}
      placeholder={placeholder}
      icon={<Clock className='h-4 w-4 shrink-0 text-gray-400' />}
      options={timeOptions.map(minutes => ({ value: String(minutes), label: formatTime(minutes) }))}
    />
  );
}
