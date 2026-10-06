import { config } from './config.js';

interface Sesion {
  token: string | null;
  refreshToken: string | null;
  expiraEn: number;
}

const sesion: Sesion = { token: null, refreshToken: null, expiraEn: 0 };

export class ApiError extends Error {
  constructor(
    mensaje: string,
    readonly estado: number | null,
    readonly cuerpo?: unknown
  ) {
    super(mensaje);
    this.name = 'ApiError';
  }
}

function expiracionDelJwt(token: string): number {
  try {
    const carga = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return typeof carga.exp === 'number' ? carga.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function bruto(
  metodo: 'GET' | 'POST',
  ruta: string,
  opciones: {
    query?: Record<string, string | number | undefined>;
    cuerpo?: unknown;
    cabeceras?: Record<string, string>;
  } = {}
): Promise<{ estado: number; json: any }> {
  const url = new URL(ruta, config.baseUrl);
  for (const [k, v] of Object.entries(opciones.query ?? {})) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }
  const respuesta = await fetch(url, {
    method: metodo,
    headers: {
      ...(opciones.cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...opciones.cabeceras
    },
    body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
    signal: AbortSignal.timeout(config.tiempoRedMs)
  });
  let json: any = null;
  try {
    json = await respuesta.json();
  } catch {
    // Respuesta sin cuerpo JSON: se devuelve null y manda el estado.
  }
  return { estado: respuesta.status, json };
}

async function iniciarSesion(): Promise<void> {
  if (!config.email || !config.password) {
    throw new ApiError(
      'Credenciales no configuradas: define MCP_EMAIL y MCP_PASSWORD en la configuración MCP del cliente.',
      null
    );
  }
  const { estado, json } = await bruto('POST', '/api/auth/login', {
    cuerpo: {
      email: config.email,
      password: config.password,
      ...(config.codigo ? { codigo: config.codigo } : {})
    }
  });
  if (json?.requiereCodigo) {
    throw new ApiError(
      'El rol exige código de turno y el usuario no tiene asistencia marcada: define MCP_CODIGO con el código del día.',
      estado,
      json
    );
  }
  if (estado !== 200 || !json?.token) {
    throw new ApiError(`Login falló (${estado}): ${json?.message ?? 'sin detalle'}`, estado, json);
  }
  sesion.token = json.token as string;
  sesion.refreshToken = (json.refreshToken as string | undefined) ?? null;
  sesion.expiraEn = expiracionDelJwt(json.token);
}

async function renovar(): Promise<boolean> {
  if (!sesion.refreshToken) return false;
  const { estado, json } = await bruto('POST', '/api/auth/refresh', {
    cabeceras: { 'x-refresh-token': sesion.refreshToken }
  });
  if (estado !== 200 || !json?.token) {
    sesion.refreshToken = null;
    return false;
  }
  sesion.token = json.token as string;
  sesion.refreshToken = (json.refreshToken as string | undefined) ?? sesion.refreshToken;
  sesion.expiraEn = expiracionDelJwt(json.token);
  return true;
}

async function autenticar(): Promise<string> {
  const margen = Date.now() + 30_000;
  if (sesion.token && sesion.expiraEn > margen) return sesion.token;
  if (sesion.token && (await renovar())) return sesion.token!;
  await iniciarSesion();
  return sesion.token!;
}

/** Quita el sobre {success, data} cuando existe y devuelve el dato útil. */
function desenvolver(json: any): unknown {
  if (
    json &&
    typeof json === 'object' &&
    !Array.isArray(json) &&
    'success' in json &&
    'data' in json
  ) {
    return json.data;
  }
  return json;
}

export async function api<T = unknown>(
  metodo: 'GET' | 'POST',
  ruta: string,
  opciones: { query?: Record<string, string | number | undefined>; cuerpo?: unknown } = {}
): Promise<T> {
  let token: string;
  try {
    token = await autenticar();
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      `No se pudo autenticar contra ${config.baseUrl}: ${(e as Error).message}`,
      null
    );
  }

  let { estado, json } = await bruto(metodo, ruta, {
    ...opciones,
    cabeceras: { Authorization: `Bearer ${token}` }
  });

  if (estado === 401) {
    sesion.token = null;
    token = await autenticar();
    ({ estado, json } = await bruto(metodo, ruta, {
      ...opciones,
      cabeceras: { Authorization: `Bearer ${token}` }
    }));
  }

  if (estado >= 400) {
    throw new ApiError(
      `${metodo} ${ruta} falló (${estado}): ${json?.message ?? json?.error ?? 'sin detalle'}`,
      estado,
      json
    );
  }
  return desenvolver(json) as T;
}

export async function ping(): Promise<unknown> {
  const { estado, json } = await bruto('GET', '/api/ping');
  return { estado, respuesta: json };
}

export function destino(): string {
  return config.baseUrl;
}
