'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export interface ReenvioAvisoResultado {
  /** `true` solo cuando el WhatsApp al administrador salió. */
  avisado: boolean;
  mensaje: string;
  ultimoAvisoEn: string | null;
  /** Segundos que faltan para poder reenviar (0 = puede ya). */
  esperarSegundos: number;
}

/**
 * Reenvía al administrador el aviso de un cierre de caja que quedó pendiente.
 *
 * No cierra nada ni crea una solicitud nueva: vuelve a mandar el mismo WhatsApp con el
 * link de autorización. Existe porque el cierre se puede quedar en silencio (el mensaje
 * no llegó, el admin no lo vio) y el índice único parcial impide pedir el cierre del
 * turno dos veces.
 *
 * El servidor enfría los reenvíos (un minuto) para que insistir no convierta el WhatsApp
 * del administrador en spam: un 429 no es un fallo del cajero, así que se avisa con
 * `warning` y con los segundos que faltan, no con `error`.
 *
 * `reenviandoId` es el id de la caja que está en vuelo: permite girar solo el botón que
 * se apretó y no bloquear toda la lista.
 */
export function useReenviarAvisoCierre() {
  const [reenviandoId, setReenviandoId] = useState<string | number | null>(null);

  const reenviarAvisoCierre = useCallback(
    async (id_caja: string | number): Promise<ReenvioAvisoResultado | null> => {
      setReenviandoId(id_caja);
      try {
        const response = await fetch('/api/cashregister/cierre/reenviar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_caja })
        });

        const result = await response.json().catch(() => ({}));
        const payload = result.data ?? {};

        const salida: ReenvioAvisoResultado = {
          avisado: response.ok && result.success === true,
          mensaje: result.message || '',
          ultimoAvisoEn: payload.ultimo_aviso_en ?? null,
          esperarSegundos: Number(payload.esperar_segundos || 0)
        };

        if (salida.avisado) {
          toast.success(salida.mensaje || 'Aviso reenviado al administrador');
        } else if (response.status === 429) {
          toast.warning(salida.mensaje || 'Espera un momento antes de reenviar el aviso');
        } else {
          toast.error(salida.mensaje || 'No se pudo reenviar el aviso al administrador');
        }

        return salida;
      } catch {
        toast.error('No se pudo reenviar el aviso al administrador');
        return null;
      } finally {
        setReenviandoId(null);
      }
    },
    []
  );

  return { reenviarAvisoCierre, reenviandoId };
}
