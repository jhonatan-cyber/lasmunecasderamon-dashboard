import { useState, useCallback, useMemo } from 'react';
import { formatNumberInput } from '@/lib/utils/formatters';

export function useNumberFormatter(initialValue: number = 0) {
  const [formattedValue, setFormattedValue] = useState<string>(
    initialValue ? formatNumberInput(initialValue) : ''
  );

  const formatNumber = useCallback((value: string | number) => {
    return formatNumberInput(value);
  }, []);

  const getNumericValue = useCallback((formatted: string) => {
    return String(formatted).replace(/\D/g, '');
  }, []);

  const handleChange = useCallback(
    (value: string, onChange: (value: number) => void) => {
      const formatted = formatNumber(value);
      setFormattedValue(formatted);
      onChange(Number(getNumericValue(formatted)) || 0);
    },
    [formatNumber, getNumericValue]
  );

  return useMemo(
    () => ({
      formattedValue,
      setFormattedValue,
      formatNumber,
      getNumericValue,
      handleChange
    }),
    [formattedValue, formatNumber, getNumericValue, handleChange]
  );
}
