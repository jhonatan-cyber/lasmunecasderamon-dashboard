import { query } from '@/lib/database/db';

export interface EntregaWhatsApp {
  message_sid: string;
  account_sid: string;
  destino: string | null;
  tipo: string;
  estado: string;
  progreso: number;
  error_code: string | null;
}

/** A callback can arrive before messages.create resolves; never downgrade delivery. */
export async function guardarEntrega(data: EntregaWhatsApp) {
  await query(
    `INSERT INTO whatsapp_entregas
      (message_sid, account_sid, destino, tipo, estado, progreso, error_code)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (message_sid) DO UPDATE SET
       destino = COALESCE(EXCLUDED.destino, whatsapp_entregas.destino),
       tipo = CASE WHEN EXCLUDED.tipo = 'prueba' THEN 'prueba' ELSE whatsapp_entregas.tipo END,
       estado = CASE WHEN EXCLUDED.progreso >= whatsapp_entregas.progreso THEN EXCLUDED.estado ELSE whatsapp_entregas.estado END,
       error_code = CASE WHEN EXCLUDED.progreso >= whatsapp_entregas.progreso THEN EXCLUDED.error_code ELSE whatsapp_entregas.error_code END,
       progreso = GREATEST(EXCLUDED.progreso, whatsapp_entregas.progreso),
       fecha_mod = CASE WHEN EXCLUDED.progreso > whatsapp_entregas.progreso OR EXCLUDED.estado = whatsapp_entregas.estado THEN now() ELSE whatsapp_entregas.fecha_mod END
     WHERE whatsapp_entregas.account_sid = EXCLUDED.account_sid`,
    [
      data.message_sid,
      data.account_sid,
      data.destino,
      data.tipo,
      data.estado,
      data.progreso,
      data.error_code
    ]
  );
}

export async function listarEntregas(accountSid: string) {
  return query<
    Array<{
      message_sid: string;
      destino: string | null;
      tipo: string;
      estado: string;
      error_code: string | null;
      fecha_crea: string;
      fecha_mod: string;
    }>
  >(
    `SELECT message_sid, destino, tipo, estado, error_code, fecha_crea, fecha_mod
     FROM whatsapp_entregas WHERE account_sid = ? ORDER BY fecha_crea DESC, message_sid LIMIT 20`,
    [accountSid]
  );
}
