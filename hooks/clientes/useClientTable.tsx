'use client';

import { useState, useCallback } from 'react';
import { User, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Client } from '@/types/client';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';

export function useClientTable() {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const { hasPermission } = useUserPermissions();

  const canViewDetails = hasPermission('clients', 'view_details');
  const canEdit = hasPermission('clients', 'edit');
  const canDelete = hasPermission('clients', 'delete');
  const hasAnyAction = canViewDetails || canEdit || canDelete;

  const handleDeleteClick = useCallback((client: Client) => {
    setClientToDelete(client);
    setDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (clientToDelete) {
      const client = clientToDelete;
      setClientToDelete(null);
      return client;
    }
    return null;
  }, [clientToDelete]);

  const handleCloseDeleteModal = useCallback(() => {
    setDeleteModalOpen(false);
    setClientToDelete(null);
  }, []);

  const renderRun = useCallback((run: string | undefined | null) => {
    if (!run || run === '0') {
      return (
        <Badge
          variant='outline'
          className='text-purple-600 border-purple-300 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800 text-xs sm:text-sm'
        >
          <User className='h-3 w-3 mr-1' />
          Sin RUT
        </Badge>
      );
    }
    return run;
  }, []);

  const renderPhone = useCallback((phone: string | undefined | null | '0') => {
    if (!phone || phone === '0') {
      return (
        <Badge
          variant='outline'
          className='text-purple-600 border-purple-300 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800 text-xs sm:text-sm'
        >
          <Phone className='h-3 w-3 mr-1' />
          Sin teléfono
        </Badge>
      );
    }
    return phone;
  }, []);

  return {
    deleteModalOpen,
    clientToDelete,
    canViewDetails,
    canEdit,
    canDelete,
    hasAnyAction,
    handleDeleteClick,
    handleConfirmDelete,
    handleCloseDeleteModal,
    renderRun,
    renderPhone,
    setDeleteModalOpen
  };
}
