'use client';

import { useState } from 'react';
import { useEmployees } from '@/hooks/personal';
import { formatNumberCL } from '@/lib/utils/formatters';

interface UseOvertimeFormProps {
  onSubmit: (data: { usuario_id: string; hora: number; monto: number }) => Promise<void>;
}

export function useOvertimeForm({ onSubmit }: UseOvertimeFormProps) {
  const { data: employeesResponse } = useEmployees();
  const employees = employeesResponse?.data || [];

  const [selectedUser, setSelectedUser] = useState('');
  const [hora, setHora] = useState('');
  const [monto, setMonto] = useState('');
  const [montoDisplay, setMontoDisplay] = useState('');

  const reset = () => {
    setSelectedUser('');
    setHora('');
    setMonto('');
    setMontoDisplay('');
  };

  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
    setMonto(raw);
    setMontoDisplay(raw ? formatNumberCL(parseInt(raw)) : '');
  };

  const calculateTotal = () => (parseFloat(hora) || 0) * (parseFloat(monto) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ usuario_id: selectedUser, hora: parseFloat(hora), monto: parseFloat(monto) });
    reset();
  };

  return {
    employees,
    selectedUser,
    setSelectedUser,
    hora,
    setHora,
    monto,
    montoDisplay,
    handleMontoChange,
    calculateTotal,
    handleSubmit
  };
}
