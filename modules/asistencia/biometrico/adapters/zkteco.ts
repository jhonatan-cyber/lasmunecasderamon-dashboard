import type { BiometricEvent, BiometricMetodo } from '@/modules/asistencia/biometrico/types';

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
