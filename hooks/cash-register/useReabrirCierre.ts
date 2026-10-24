'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export interface ReabrirCierreResultado {
  reabierto: boolean;
  mensaje: string;
}

export function useReabrirCierre() {
  const [reabriendoId, setReabriendoId] = useState<string | number | null>(null);

  const reabrirCierre = useCallback(
    async (id_caja: string | number): Promise<ReabrirCierreResultado | null> => {
      setReabriendoId(id_caja);
      try {
        const response = await fetch('/api/cashregister/closing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_caja, motivo: 'Segundo pedido de cierre' })
        });

        const result = await response.json().catch(() => ({}));
        const mensaje = result.message || '';

        if (!response.ok && response.status !== 202) {
          toast.error(mensaje || 'No se pudo pedir el cierre de nuevo');
          return { reabierto: false, mensaje };
        }

        toast.success(mensaje || 'Se pidió el cierre de nuevo al administrador');
        return { reabierto: true, mensaje };
      } catch {
        toast.error('No se pudo pedir el cierre de nuevo');
        return null;
      } finally {
        setReabriendoId(null);
      }
    },
    []
  );

  return { reabrirCierre, reabriendoId };
}
