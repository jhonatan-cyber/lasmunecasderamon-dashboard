'use client';

import { PendingApprovals } from '@/components/bar/PendingApprovals';
import { ListLoadError } from '@/components/shared/ListLoadError';
import type { TransferRecord } from '@/types/transfer';

interface BarPendientesTabProps {
  pendingError: boolean;
  onRetry: () => void;
  pendientes: TransferRecord[];
  puedeAprobar: boolean;
  resolvingId: string | null;
  loading: boolean;
  onResolve: (id: string, accion: 'aprobar' | 'rechazar') => void;
}

export function BarPendientesTab({
  pendingError,
  onRetry,
  pendientes,
  puedeAprobar,
  resolvingId,
  loading,
  onResolve
}: BarPendientesTabProps) {
  if (pendingError) {
    return (
      <ListLoadError
        message='No se pudieron cargar las recepciones pendientes.'
        onRetry={onRetry}
      />
    );
  }

  return (
    <>
      <div className='space-y-2 mb-4'>
        <p className='text-sm text-muted-foreground'>
          Solicitudes pendientes de aprobación del bar.
        </p>
      </div>
      <PendingApprovals
        pendientes={pendientes}
        puedeAprobar={puedeAprobar}
        resolvingId={resolvingId}
        loading={loading}
        onResolve={onResolve}
      />
    </>
  );
}
