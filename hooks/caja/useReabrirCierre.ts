'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export interface ReabrirCierreResultado {
  /** `true` cuando el servidor aceptó el nuevo pedido y volvió a avisar al administrador. */
  reabierto: boolean;
  mensaje: string;
}

/**
 * Pide el cierre de nuevo cuando un cierre pendiente quedó sin respuesta.
 *
 * A diferencia del reenvío, este **sí crea una solicitud nueva**: el servidor expira la vieja
 * (nadie contestó dentro de la ventana de recordatorios) y emite otro token, con lo que el
 * aviso al administrador vuelve a salir desde cero. Es el mismo endpoint que el primer pedido
 * (`POST /api/cashregister/cierre`), porque para el servidor "volver a pedir" es pedir.
 *
 * Si todavía no pasó la ventana, el servidor responde 409 con el motivo y eso se muestra tal
 * cual: el cajero no hizo nada mal, solo llegó temprano.
 *
 * El 202 (la solicitud quedó, pero el WhatsApp no salió) no es un error: el cierre sigue
 * pendiente de autorización igual.
 */
export function useReabrirCierre() {
  const [reabriendoId, setReabriendoId] = useState<string | number | null>(null);

  const reabrirCierre = useCallback(
    async (id_caja: string | number): Promise<ReabrirCierreResultado | null> => {
      setReabriendoId(id_caja);
      try {
        const response = await fetch('/api/cashregister/cierre', {
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
