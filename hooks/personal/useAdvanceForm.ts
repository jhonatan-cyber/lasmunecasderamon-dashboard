'use client';

import { useState, useEffect } from 'react';
import { useUsers } from '@/hooks/personal';
import { formatNumberCL } from '@/lib/utils/formatters';

interface UseAdvanceFormProps {
  open: boolean;
  onSubmit: (data: { usuario_id: string; monto: string; motivo: string }) => Promise<void>;
}

export function useAdvanceForm({ open, onSubmit }: UseAdvanceFormProps) {
  const { users, isLoading: loadingUsers, setPageSize, setFilterStatus } = useUsers();
  const [selectedUser, setSelectedUser] = useState('');
  const [monto, setMonto] = useState('');
  const [montoDisplay, setMontoDisplay] = useState('');
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (open) {
      setPageSize(100);
      setFilterStatus('active');
    }
  }, [open, setPageSize, setFilterStatus]);

  useEffect(() => {
    if (!open) {
      setSelectedUser('');
      setMonto('');
      setMontoDisplay('');
      setMotivo('');
    }
  }, [open]);

  const [loadingBalance, setLoadingBalance] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (selectedUser) {
      setLoadingBalance(true);
      fetch(`/api/anticipos/balances?usuario_id=${selectedUser}`)
        .then(res => res.json())
        .then(res => {
          if (res.success) setBalance(res.data.montoMaximo);
          else setBalance(0);
        })
        .catch(() => setBalance(0))
        .finally(() => setLoadingBalance(false));
    } else {
      setBalance(null);
    }
  }, [selectedUser]);

  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
    setMonto(raw);
    setMontoDisplay(raw ? formatNumberCL(parseInt(raw)) : '');
  };

  useEffect(() => {
    if (motivo) {
      const capitalized = motivo.charAt(0).toUpperCase() + motivo.slice(1);
      if (capitalized !== motivo) {
        setMotivo(capitalized);
      }
    }
  }, [motivo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !monto || Number(monto) <= 0) return;
    await onSubmit({ usuario_id: selectedUser, monto, motivo });
  };

  const eligibleUsers = users.filter(u => {
    const rolId = Number(u.rol_id || 0);
    const status = Number(u.status ?? (u as any).estado ?? 0);
    const roleName = (u.role || '').toLowerCase();

    const isAdmin = rolId === 1 || roleName === 'administrador';
    const isActive = status === 1;

    return !isAdmin && isActive;
  });

  return {
    users: eligibleUsers,
    loadingUsers,
    selectedUser,
    setSelectedUser,
    monto,
    montoDisplay,
    handleMontoChange,
    motivo,
    setMotivo,
    handleSubmit,
    balance,
    loadingBalance
  };
}
