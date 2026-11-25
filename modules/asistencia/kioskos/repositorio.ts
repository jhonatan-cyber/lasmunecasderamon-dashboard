import { query, type TransactionQuery } from '@/lib/database/db';

export interface DesafioAsistenciaRow {
  id_desafio: string;
  usuario_id: string;
  emisor_usuario_id: string | null;
  expira_en: Date | string;
  usado_en: Date | string | null;
}

export async function reemplazarDesafioUsuario(data: {
  id: string;
  usuarioId: string;
  tokenHash: string;
  emitidoPor: string;
  emisorUsuarioId: string | null;
  expiraEn: string;
}): Promise<void> {
  await query('DELETE FROM asistencia_desafios WHERE usuario_id = ?', [data.usuarioId]);
  await query(
    `INSERT INTO asistencia_desafios
       (id_desafio, usuario_id, token_hash, emitido_por, emisor_usuario_id, expira_en)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.id, data.usuarioId, data.tokenHash, data.emitidoPor, data.emisorUsuarioId, data.expiraEn]
  );
}

export function canjearDesafio(
  tokenHash: string,
  usuarioId: string
): Promise<Array<{ usuario_id: string }>> {
  return query(
    `UPDATE asistencia_desafios
        SET usado_en = now()
      WHERE token_hash = ?
        AND usado_en IS NULL
        AND expira_en > now()
        AND (usuario_id = ? OR emisor_usuario_id = ?)
      RETURNING usuario_id`,
    [tokenHash, usuarioId, usuarioId]
  );
}

export function buscarDesafioPorHash(tokenHash: string): Promise<DesafioAsistenciaRow[]> {
  return query(
    `SELECT id_desafio, usuario_id, emisor_usuario_id, expira_en, usado_en
       FROM asistencia_desafios
      WHERE token_hash = ?
      LIMIT 1`,
    [tokenHash]
  );
}

export async function eliminarDesafio(id: string): Promise<void> {
  await query('DELETE FROM asistencia_desafios WHERE id_desafio = ?', [id]);
}

export async function contarDesafiosVigentes(usuarioId: string): Promise<number> {
  const rows = await query<Array<{ n: string }>>(
    `SELECT count(*) AS n FROM asistencia_desafios
      WHERE usuario_id = ? AND usado_en IS NULL AND expira_en > now()`,
    [usuarioId]
  );
  return Number(rows[0]?.n ?? 0);
}

export async function actualizarDispositivoKiosko(
  trx: TransactionQuery,
  tokenHash: string
): Promise<void> {
  await trx(
    'UPDATE kiosk_devices SET revocado_en = CURRENT_TIMESTAMP WHERE token_hash = ? AND revocado_en IS NULL',
    [tokenHash]
  );
}

export async function crearDispositivoKiosko(
  trx: TransactionQuery,
  data: { id: string; nombre: string; tokenHash: string; userId: string }
): Promise<void> {
  await trx('INSERT INTO kiosk_devices (id, nombre, token_hash, creado_por) VALUES (?, ?, ?, ?)', [
    data.id,
    data.nombre,
    data.tokenHash,
    data.userId
  ]);
}

export function buscarDispositivoKiosko(tokenHash: string): Promise<Array<{ id: string }>> {
  return query(
    'SELECT id FROM kiosk_devices WHERE token_hash = ? AND revocado_en IS NULL AND expira_en > CURRENT_TIMESTAMP',
    [tokenHash]
  );
}

export function renovarDispositivoKiosko(tokenHash: string): Promise<Array<{ id: string }>> {
  return query(
    `UPDATE kiosk_devices SET ultimo_uso = CURRENT_TIMESTAMP, expira_en = CURRENT_TIMESTAMP + interval '30 days'
     WHERE token_hash = ? AND revocado_en IS NULL AND expira_en > CURRENT_TIMESTAMP RETURNING id`,
    [tokenHash]
  );
}

export async function dispositivoKioskoActivo(id: string): Promise<boolean> {
  const rows = await query<Array<{ id: string }>>(
    'SELECT id FROM kiosk_devices WHERE id = ? AND revocado_en IS NULL AND expira_en > CURRENT_TIMESTAMP',
    [id]
  );
  return rows.length > 0;
}

export async function revocarDispositivoKiosko(id: string): Promise<void> {
  await query(
    'UPDATE kiosk_devices SET revocado_en = CURRENT_TIMESTAMP WHERE id = ? AND revocado_en IS NULL',
    [id]
  );
}

export function listarDispositivosKiosko() {
  return query<
    {
      id: string;
      nombre: string;
      fecha_crea: string;
      ultimo_uso: string;
      expira_en: string;
      revocado_en: string | null;
      activo: boolean;
    }[]
  >(
    'SELECT id, nombre, fecha_crea, ultimo_uso, expira_en, revocado_en, (revocado_en IS NULL AND expira_en > CURRENT_TIMESTAMP) AS activo FROM kiosk_devices ORDER BY fecha_crea DESC'
  );
}
