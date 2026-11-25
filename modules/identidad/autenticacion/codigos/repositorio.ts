import { query } from '@/lib/database/db';

export function obtenerCodigoActual(): Promise<Array<{ codigo: unknown }>> {
  return query('SELECT codigo FROM codigos WHERE estado = 1 ORDER BY fecha_crea DESC LIMIT 1');
}

export async function reemplazarCodigoActual(data: {
  id: string;
  codigo: string;
  fecha: string;
}): Promise<void> {
  await query('DELETE FROM codigos');
  await query('INSERT INTO codigos (id_codigo, codigo, fecha_crea, estado) VALUES (?, ?, ?, 1)', [
    data.id,
    data.codigo,
    data.fecha
  ]);
}
