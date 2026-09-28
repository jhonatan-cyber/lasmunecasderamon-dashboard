import { Gratificacion } from '@/types/gratificacion';

export interface PartitionedGratificaciones {
  /** Filas donde el usuario es el beneficiario (usuario_id = yo). */
  myGratificaciones: Gratificacion[];
  /** Filas que el usuario solicitó para otros (solicitante_id = yo, beneficiario distinto). */
  myRequests: Gratificacion[];
}

/**
 * Parte el resultado del GET /api/gratificaciones (lo suyo + lo que él solicitó)
 * en las dos mitades que la página del cajero muestra en secciones distintas.
 * Sin sesión identificada devuelve todo como "propio" (comportamiento admin/común puro).
 */
export function partitionGratificaciones(
  gratificaciones: Gratificacion[],
  myId: string | number | null | undefined
): PartitionedGratificaciones {
  if (myId == null) {
    return { myGratificaciones: gratificaciones, myRequests: [] };
  }
  const id = String(myId);
  return {
    myGratificaciones: gratificaciones.filter(g => String(g.usuario_id) === id),
    myRequests: gratificaciones.filter(
      g => String(g.solicitante_id ?? '') === id && String(g.usuario_id) !== id
    )
  };
}
