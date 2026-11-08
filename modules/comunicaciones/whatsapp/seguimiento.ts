import { ValidationError } from '@/lib/errors/errors';
import { guardarEntrega, listarEntregas } from './seguimientoRepositorio';
import { credencialesParaWebhook } from './administradores';

const PROGRESO: Record<string, number> = {
  accepted: 0,
  scheduled: 0,
  queued: 1,
  sending: 2,
  sent: 3,
  canceled: 4,
  failed: 4,
  undelivered: 4,
  delivered: 5,
  read: 6
};

export async function registrarEntregaWhatsApp(data: {
  sid: string;
  accountSid: string;
  destino?: string | null;
  estado: string;
  errorCode?: string | null;
  tipo?: 'mensaje' | 'prueba';
}) {
  if (
    !/^SM[0-9a-f]{32}$/i.test(data.sid) ||
    !/^AC[0-9a-f]{32}$/i.test(data.accountSid) ||
    !Object.hasOwn(PROGRESO, data.estado)
  ) {
    throw new ValidationError('Estado o identificador de mensaje inválido');
  }
  if (data.errorCode && !/^\d{1,16}$/.test(data.errorCode))
    throw new ValidationError('Código de error inválido');
  const destino = data.destino?.replace(/^whatsapp:/, '') || null;
  if (destino && !/^\+\d{7,15}$/.test(destino)) throw new ValidationError('Destino inválido');
  await guardarEntrega({
    message_sid: data.sid,
    account_sid: data.accountSid,
    destino,
    tipo: data.tipo || 'mensaje',
    estado: data.estado,
    progreso: PROGRESO[data.estado],
    error_code: data.errorCode || null
  });
}

export async function historialWhatsApp() {
  // Los mensajes salen de la cuenta global o de la propia de cada administrador:
  // se reúnen las entregas de todas las cuentas configuradas.
  const cuentas = (await credencialesParaWebhook()).map(credencial => credencial.accountSid);
  if (cuentas.length === 0) return [];
  const listas = await Promise.all(cuentas.map(accountSid => listarEntregas(accountSid)));
  return listas
    .flat()
    .sort((a, b) => String(b.fecha_crea).localeCompare(String(a.fecha_crea)))
    .slice(0, 20)
    .map(row => ({
      ...row,
      destino: row.destino ? `••••${row.destino.slice(-4)}` : null
    }));
}
