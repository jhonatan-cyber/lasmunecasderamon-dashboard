import type { BiometricMetodo } from './types';

/** Traduce el código de método del equipo a la taxonomía del dominio. */
export function metodoBiometricoDesdeCodigo(method: number | null): BiometricMetodo {
  switch (method) {
    case 0:
      return 'clave';
    case 1:
      return 'tarjeta';
    case 6:
      return 'huella';
    case 15:
      return 'cara';
    default:
      return 'otro';
  }
}

/**
 * Encola un registro una sola vez y respeta los reintentos ya consumidos.
 *
 * La cola, el set de trabajos en vuelo y el contador de intentos los mantiene
 * cada flujo; acá sólo vive la regla común para no duplicarla.
 */
export function encolarPendiente<T extends { recordId: string }>(params: {
  pendiente: T;
  enVuelo: Set<string>;
  intentos: Map<string, number>;
  maxIntentos: number;
  cola: T[];
  bombear: () => void;
}): void {
  const { pendiente, enVuelo, intentos, maxIntentos, cola, bombear } = params;
  if (enVuelo.has(pendiente.recordId)) return;
  if ((intentos.get(pendiente.recordId) ?? 0) >= maxIntentos) return;
  enVuelo.add(pendiente.recordId);
  cola.push(pendiente);
  bombear();
}

/** Parsea los parámetros `clave=valor` de un encabezado Digest. */
export function parsearParametrosDigest(header: string): Record<string, string> {
  const params: Record<string, string> = {};
  const re = /(\w+)=(?:"([^"]*)"|([^,]*))/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(header)) !== null) {
    params[match[1].toLowerCase()] = match[2] ?? match[3] ?? '';
  }
  return params;
}
