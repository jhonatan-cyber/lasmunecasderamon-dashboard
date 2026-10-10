'use client';

import { useState, useRef } from 'react';
import { useEmployees } from '@/hooks/personal';
import { formatNumberCL } from '@/lib/utils/formatters';

interface UseOvertimeFormProps {
  onSubmit: (data: { usuario_id: string; hora: number; monto: number }) => Promise<void | boolean>;
}

export function useOvertimeForm({ onSubmit }: UseOvertimeFormProps) {
  const { data: employeesResponse } = useEmployees();
  const employees = employeesResponse?.data || [];

  const [selectedUser, setSelectedUser] = useState('');
  const [hora, setHora] = useState('');
  const [monto, setMonto] = useState('');
  const [montoDisplay, setMontoDisplay] = useState('');
  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const hours = Number(hora);
    const amount = Number(monto);
    if (
      submitting.current ||
      !selectedUser ||
      !Number.isFinite(hours) ||
      hours <= 0 ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isFinite(hours * amount)
    )
      return;
    submitting.current = true;
    setIsSubmitting(true);
    try {
      const saved = await onSubmit({ usuario_id: selectedUser, hora: hours, monto: amount });
      if (saved !== false) reset();
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
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
    handleSubmit,
    isSubmitting
  };
}
