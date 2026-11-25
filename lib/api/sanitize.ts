// ─── Normalización de input y señales de monitoreo ───────────────────────
// No sustituye la validación de esquemas ni las consultas parametrizadas.
// El detector SQL solo registra patrones sospechosos; no bloquea solicitudes.

/**
 * Elimina caracteres peligrosos de inyección XSS de strings.
 * Mantiene caracteres Unicode válidos pero elimina tags HTML y eventos JS.
 */
export function sanitizeXSS(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Elimina null bytes que pueden usarse en ataques de truncamiento.
 */
export function sanitizeNullBytes(value: string): string {
  return value.replace(/\0/g, '');
}

/**
 * Recorta strings a una longitud máxima para prevenir ataques de buffer.
 */
export function sanitizeMaxLength(value: string, max: number = 10000): string {
  return value.length > max ? value.slice(0, max) : value;
}

/**
 * Sanitiza recursivamente un objeto, aplicando todas las protecciones.
 */
export function sanitizeBody(obj: unknown, maxDepth: number = 10): unknown {
  if (maxDepth <= 0) return '[MAX_DEPTH]';

  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeMaxLength(sanitizeNullBytes(obj));
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeBody(item, maxDepth - 1));
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitizar claves de propiedades también
      const cleanKey = sanitizeNullBytes(key).replace(/[<>]/g, '');
      sanitized[cleanKey] = sanitizeBody(value, maxDepth - 1);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Detecta heurísticamente patrones sospechosos de SQL para monitoreo.
 * No confirma una inyección ni debe usarse como control de acceso o bloqueo.
 */
export function detectSQLInjection(value: string): boolean {
  const patterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b)/i,
    /(--|;|\/\*|\*\/)/,
    /(\bOR\b\s+\d+\s*=\s*\d+)/i,
    /(\bAND\b\s+\d+\s*=\s*\d+)/i,
    /('\s*(OR|AND)\s+')/i,
    /(\bWAITFOR\b\s+\bDELAY\b)/i,
    /(\bBENCHMARK\b\s*\()/i,
    /(\bSLEEP\b\s*\(\s*\d+\s*\))/i
  ];

  return patterns.some(pattern => pattern.test(value));
}

/**
 * Busca recursivamente patrones sospechosos para registrarlos en logs.
 * Retorna las rutas encontradas; el resultado no modifica ni rechaza el body.
 */
export function scanForSQLInjection(obj: unknown, path: string = ''): string[] {
  const injections: string[] = [];

  if (typeof obj === 'string' && detectSQLInjection(obj)) {
    injections.push(path || 'root');
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      injections.push(...scanForSQLInjection(item, `${path}[${index}]`));
    });
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      injections.push(...scanForSQLInjection(value, path ? `${path}.${key}` : key));
    }
  }

  return injections;
}

/**
 * Normaliza null bytes y claves de un body JSON y recopila avisos de monitoreo.
 * La validación de campos corresponde a los esquemas del endpoint.
 * Retorna { body: sanitizedBody, warnings: string[] } o null si no es JSON.
 */
export async function sanitizeRequest(
  request: Request
): Promise<{ body: unknown; warnings: string[] } | null> {
  const contentType = request.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    return null;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null;
  }

  const warnings: string[] = [];

  // Detectar inyección SQL
  const sqlInjections = scanForSQLInjection(body);
  if (sqlInjections.length > 0) {
    warnings.push(`Patrones sospechosos detectados en: ${sqlInjections.join(', ')}`);
  }

  // Sanitizar el body
  const sanitized = sanitizeBody(body);

  return { body: sanitized, warnings };
}
