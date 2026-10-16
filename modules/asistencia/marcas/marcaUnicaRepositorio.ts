import type { TransactionQuery } from '@/lib/database/db';

export async function insertarMarcaSiFalta(
  trx: TransactionQuery,
  datos: {
    id_asistencia: string;
    usuario_id: string;
    fecha: string;
    hora: string;
    estado: number;
    origen?: string;
    biometric_record_id?: string | null;
  }
): Promise<boolean> {
  const keys = Object.keys(datos) as Array<keyof typeof datos>;
  const rows = await trx<Array<{ id_asistencia: string }>>(
    `INSERT INTO asistencias (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})
     ON CONFLICT (usuario_id, fecha) DO NOTHING RETURNING id_asistencia`,
    keys.map(key => datos[key])
  );
  return rows.length > 0;
}
