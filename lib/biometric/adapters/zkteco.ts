import type { BiometricEvent, BiometricMetodo } from '@/lib/biometric/types';

/**
 * Adapter ZKTeco — protocolo ADMS / iClock push.
 *
 * El equipo inicia toda la conexión (el servidor nunca lo llama):
 *
 *   GET  /iclock/cdata?SN=...&options=all   → handshake: respondemos las opciones
 *                                              (TransInterval, TransFlag…) y el
 *                                              equipo se encarga de conectarse solo.
 *   POST /iclock/cdata?SN=...&table=ATTLOG  → filas TSV:
 *                                              PIN \t fecha \t verify \t inOut \t …
 *   GET  /iclock/getrequest                 → cola de comandos (hoy vacía).
 *
 * El serial del equipo es la única credencial: hay que darlo de alta en
 * Configuraciones → Asistencia antes de que sus eventos se acepten.
 */

/** Tabla de opciones que el equipo pide en el handshake. El cuerpo termina en `0`. */
export function buildAdmsOptions(serial: string): string {
  return [
    `GET OPTION FROM: ${serial}`,
    'STAMP=9999',
    'ATTLOGSTAMP=0',
    'OPERLOGStamp=0',
    'ATTPHOTOStamp=0',
    'ErrorDelay=30',
    'Delay=10',
    'TransTimes=00:00;23:59',
    // Cada minuto y además en tiempo real cuando ocurre la verificación.
    'TransInterval=1',
    'TransFlag=TransData AttLog OpLog EnrollUser ChgUser EnrollFP ChgFP FPImag',
    'TimeZone=-4',
    'Realtime=1',
    'Encrypt=None',
    '0',
    ''
  ].join('\n');
}

export function serialFromParams(params: URLSearchParams): string | null {
  const serial = (params.get('SN') || params.get('sn') || '').trim();
  return serial || null;
}

export function tableFromParams(params: URLSearchParams): string {
  return (params.get('table') || '').trim().toUpperCase();
}

/**
 * Significados observados del campo verify en ADMS push: 15 = cara, 1 = huella,
 * 4/2 = tarjeta, 0 = clave. Lo que no está mapeado queda como `otro` para no
 * inventar una modalidad que el equipo no reportó.
 */
const METODOS_POR_VERIFY: Record<string, BiometricMetodo> = {
  '0': 'clave',
  '1': 'huella',
  '2': 'tarjeta',
  '4': 'tarjeta',
  '15': 'cara'
};

function normalizarFecha(valor: string): string | null {
  const match = valor.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)/);
  if (!match) return null;
  const hora = match[2].length === 5 ? `${match[2]}:00` : match[2];
  return `${match[1]} ${hora}`;
}

/** Parsea el cuerpo de un `POST table=ATTLOG`. Líneas corruptas se descartan. */
export function parseAttlog(body: string): BiometricEvent[] {
  const eventos: BiometricEvent[] = [];
  for (const linea of body.split(/\r?\n/)) {
    if (!linea.trim()) continue;
    const campos = linea.split('\t');
    if (campos.length < 2) continue;
    const codigo = campos[0].trim();
    if (!codigo) continue;
    const fecha = normalizarFecha(campos[1]);
    if (!fecha) continue;
    const verify = (campos[2] ?? '').trim();
    eventos.push({
      codigo,
      fechaDispositivo: fecha,
      metodo: METODOS_POR_VERIFY[verify] ?? 'otro',
      raw: linea
    });
  }
  return eventos;
}
