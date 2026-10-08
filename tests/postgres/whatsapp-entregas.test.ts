import { afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import db, { query } from '@/lib/database/db';
import { guardarEntrega } from '@/modules/comunicaciones/whatsapp/seguimientoRepositorio';
const sid = 'SM' + randomUUID().replaceAll('-', '');
const base = {
  message_sid: sid,
  account_sid: 'AC' + 'a'.repeat(32),
  destino: '+59170000000',
  tipo: 'mensaje',
  estado: 'read',
  progreso: 6,
  error_code: null
};
afterAll(async () => {
  await query('DELETE FROM whatsapp_entregas WHERE message_sid = ?', [sid]);
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});
it('no retrocede de leído a en cola cuando el callback llega antes de la respuesta de envío', async () => {
  await guardarEntrega(base);
  await guardarEntrega({ ...base, tipo: 'prueba', estado: 'queued', progreso: 1 });
  const [row] = await query(
    'SELECT estado, tipo, progreso FROM whatsapp_entregas WHERE message_sid = ?',
    [sid]
  );
  expect(row).toMatchObject({ estado: 'read', tipo: 'prueba', progreso: 6 });
});
it('los reintentos no duplican el mensaje y una cuenta diferente no lo modifica', async () => {
  await guardarEntrega(base);
  await guardarEntrega(base);
  await guardarEntrega({
    ...base,
    account_sid: 'AC' + 'c'.repeat(32),
    estado: 'failed',
    progreso: 4,
    error_code: '63015'
  });
  const rows = await query(
    'SELECT estado, error_code FROM whatsapp_entregas WHERE message_sid = ?',
    [sid]
  );
  expect(rows).toEqual([{ estado: 'read', error_code: null }]);
});
