import { useState, useEffect } from 'react';
import { useUsers } from '@/hooks/personal/useUsers';

interface UseAdvanceFormProps {
  open: boolean;
  onSubmit: (data: { usuario_id: string; monto: string }) => Promise<void>;
}

export function useAdvanceForm({ open, onSubmit }: UseAdvanceFormProps) {
  const { users, isLoading: loadingUsers, fetchUsers } = useUsers();
  const [selectedUser, setSelectedUser] = useState('');
  const [monto, setMonto] = useState('');

  useEffect(() => {
    if (open) fetchUsers();
    if (!open) { setSelectedUser(''); setMonto(''); }
  }, [open, fetchUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ usuario_id: selectedUser, monto });
  };

  const eligibleUsers = users.filter(u => String(u.rol_id ?? '') !== '1' && u.status === 1);

  return {
    users: eligibleUsers,
    loadingUsers,
    selectedUser,
    setSelectedUser,
    monto,
    setMonto,
    handleSubmit,
  };
}
