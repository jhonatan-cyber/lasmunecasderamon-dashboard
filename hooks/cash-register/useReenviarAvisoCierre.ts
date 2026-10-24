'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export interface ReenvioAvisoResultado {
  avisado: boolean;
  mensaje: string;
  ultimoAvisoEn: string | null;
  esperarSegundos: number;
}

export function useReenviarAvisoCierre() {
  const [reenviandoId, setReenviandoId] = useState<string | number | null>(null);

  const reenviarAvisoCierre = useCallback(
    async (id_caja: string | number): Promise<ReenvioAvisoResultado | null> => {
      setReenviandoId(id_caja);
      try {
        const response = await fetch('/api/cashregister/closing/resend', {
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
