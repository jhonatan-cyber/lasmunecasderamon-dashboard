import type { BiometricEvent, BiometricMetodo } from '@/lib/biometric/types';
const CLAVES_SERIAL = [
  'SerialNo',
  'serialNo',
  'SerialNumber',
  'serialNumber',
  'serial',
  'sn',
  'SN'
];
const CLAVES_CODIGO = [
  'UserID',
  'userId',
  'user_id',
  'PersonID',
  'personId',
  'person_id',
  'Pin',
  'pin',
  'EmployeeNo',
  'employeeNo',
  'employeeCode',
  'PersonCode',
  'personCode',
  'Code',
  'code'
];
const CLAVES_FECHA = [
  'Time',
  'time',
  'Timestamp',
  'timestamp',
  'DateTime',
  'dateTime',
  'datetime',
  'EventTime',
  'eventTime',
  'OccurredTime',
  'HappenTime',
  'CreateTime'
];
const CLAVES_METODO = [
  'Mode',
  'mode',
  'method',
  'Method',
  'verifyType',
  'VerifyType',
  'AuthType',
  'authType',
  'MatchMode',
  'Type',
  'type'
];

function primerValor(objeto: Record<string, unknown>, claves: string[]): string | null {
  for (const clave of claves) {
    const valor = objeto[clave];
    if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
      return String(valor).trim();
    }
  }
  return null;
}

function normalizarFecha(valor: string): string | null {
  const limpio = valor.trim().replace(/[Zz]$|[+-]\d{2}:?\d{2}$/, '');
  const match = limpio.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)/);
  if (!match) return null;
  const hora = match[2].length === 5 ? `${match[2]}:00` : match[2];
  return `${match[1]} ${hora}`;
}

function metodoDesde(valor: string | null): BiometricMetodo {
  if (!valor) return 'otro';
  const bajo = valor.toLowerCase();
  if (bajo.includes('face') || bajo.includes('cara')) return 'cara';
  if (bajo.includes('finger') || bajo.includes('fp') || bajo.includes('huella')) return 'huella';
  if (bajo.includes('card') || bajo.includes('tarjeta') || bajo.includes('rfid')) return 'tarjeta';
  if (bajo.includes('password') || bajo.includes('pwd') || bajo.includes('pin')) return 'clave';
  switch (bajo) {
    case '15':
      return 'cara';
    case '1':
      return 'huella';
    case '2':
    case '4':
      return 'tarjeta';
    case '0':
      return 'clave';
    default:
      return 'otro';
  }
}

function comoObjetos(valor: unknown): Record<string, unknown>[] {
  if (Array.isArray(valor)) {
    return valor.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    );
  }
  if (valor && typeof valor === 'object') return [valor as Record<string, unknown>];
  return [];
}

function extraerEventos(cuerpo: Record<string, unknown>): Record<string, unknown>[] {
  for (const clave of ['events', 'Events', 'data', 'Data', 'records', 'Records', 'list', 'List']) {
    const valor = cuerpo[clave];
    if (Array.isArray(valor)) return comoObjetos(valor);
  }
  return [cuerpo];
}

export interface DahuaPush {
  serial: string | null;
  eventos: BiometricEvent[];
}

export function parseDahuaPush(body: unknown, params: URLSearchParams): DahuaPush {
  const serial =
    (params.get('serial') || params.get('sn') || '').trim() ||
    (typeof body === 'object' && body !== null && !Array.isArray(body)
      ? primerValor(body as Record<string, unknown>, CLAVES_SERIAL)
      : null);

  const raices =
    typeof body === 'string'
      ? comoObjetos(safeParse(body))
      : Array.isArray(body)
        ? comoObjetos(body)
        : body && typeof body === 'object'
          ? extraerEventos(body as Record<string, unknown>)
          : [];

  const eventos: BiometricEvent[] = [];
  for (const raiz of raices) {
    const codigo = primerValor(raiz, CLAVES_CODIGO);
    if (!codigo) continue;
    const fecha = primerValor(raiz, CLAVES_FECHA);
    const fechaNormalizada = fecha ? normalizarFecha(fecha) : null;
    const metodo = metodoDesde(primerValor(raiz, CLAVES_METODO));
    eventos.push({
      codigo,
      fechaDispositivo: fechaNormalizada,
      metodo,
      raw: JSON.stringify(raiz)
    });
  }

  return { serial, eventos };
}

function safeParse(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}
