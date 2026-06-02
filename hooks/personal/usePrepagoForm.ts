import { useNumberFormatter } from '@/hooks/shared';
import { Client } from '@/types/client';

interface UsePrepagoFormProps {
  client: Client | null;
  onSubmit: (e: React.FormEvent) => void;
}

export function usePrepagoForm({ client, onSubmit }: UsePrepagoFormProps) {
  const { 
    formattedValue, 
    setFormattedValue, 
    getNumericValue,
    formatNumber 
  } = useNumberFormatter(0);

  const reset = () => setFormattedValue('');

  const numericAmount = Number(getNumericValue(formattedValue)) || 0;

  const setAmount = (value: string) => {
    setFormattedValue(formatNumber(value));
  };

  return { amount: formattedValue, setAmount, numericAmount, reset, handleSubmit: onSubmit };
}

