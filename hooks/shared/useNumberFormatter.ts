import { useState, useCallback, useMemo } from 'react';

const formatNumberHelper = (value: string | number) => {
  const numericValue = String(value).replace(/\D/g, '');
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};


export function useNumberFormatter(initialValue: number = 0) {
  const [formattedValue, setFormattedValue] = useState<string>(
    initialValue ? formatNumberHelper(initialValue) : ''
  );

  const formatNumber = useCallback((value: string | number) => {
    return formatNumberHelper(value);
  }, []);

  const getNumericValue = useCallback((formatted: string) => {
    return formatted.replace(/\./g, '');
  }, []);

  const handleChange = useCallback((value: string, onChange: (value: number) => void) => {
    const formatted = formatNumber(value);
    setFormattedValue(formatted);
    onChange(Number(getNumericValue(formatted)) || 0);
  }, [formatNumber, getNumericValue]);

  return useMemo(() => ({
    formattedValue,
    setFormattedValue,
    formatNumber,
    getNumericValue,
    handleChange,
  }), [formattedValue, formatNumber, getNumericValue, handleChange]);
}
