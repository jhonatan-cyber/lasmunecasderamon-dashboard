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
    readonly cuerpo?: unknown,
    readonly codigo = 'ERROR_API'
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
  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      method: metodo,
      headers: {
        ...(opciones.cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...opciones.cabeceras
      },
      body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
      signal: AbortSignal.timeout(config.tiempoRedMs)
    });
  } catch (error) {
    const e = error as Error & { cause?: { code?: string } };
    const timeout = e.name === 'TimeoutError' || e.name === 'AbortError';
    const rechazado = e.cause?.code === 'ECONNREFUSED';
    throw new ApiError(
      timeout
        ? `Tiempo de espera agotado (${config.tiempoRedMs} ms) al conectar con ${config.baseUrl}.`
        : rechazado
          ? `Conexión rechazada por ${config.baseUrl}. Comprueba que el dashboard esté iniciado.`
          : `No se pudo conectar con ${config.baseUrl}. Comprueba la dirección y la red.`,
      null,
      undefined,
      timeout ? 'TIMEOUT' : rechazado ? 'CONEXION_RECHAZADA' : 'ERROR_RED'
    );
  }
  let json: any = null;
  try {
    json = await respuesta.json();
  } catch (error) {
    if (respuesta.ok) {
      throw new ApiError(
        'El dashboard devolvió una respuesta sin JSON válido.',
        respuesta.status,
        undefined,
        (error as Error).name === 'TimeoutError' || (error as Error).name === 'AbortError'
          ? 'TIMEOUT'
          : 'RESPUESTA_INVALIDA'
      );
    }
  }
  return { estado: respuesta.status, json };
}

async function iniciarSesion(): Promise<void> {
  if (!config.email || !config.password) {
    throw new ApiError(
      'Credenciales no configuradas: define MCP_EMAIL y MCP_PASSWORD en la configuración MCP del cliente.',
      null,
      undefined,
      'CREDENCIALES_FALTANTES'
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
      json,
      'CODIGO_TURNO_REQUERIDO'
    );
  }
  if (estado !== 200 || !json?.token) {
    throw new ApiError(
      `Login falló (${estado}): ${json?.message ?? 'sin detalle'}`,
      estado,
      json,
      estado === 401
        ? 'CREDENCIALES_INVALIDAS'
        : estado === 403
          ? 'PERMISOS_INSUFICIENTES'
          : 'LOGIN_FALLIDO'
    );
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
      json,
      estado === 403 ? 'PERMISOS_INSUFICIENTES' : estado === 401 ? 'SESION_RECHAZADA' : 'ERROR_HTTP'
    );
  }
  return desenvolver(json) as T;
}

export async function ping() {
  const { estado, json } = await bruto('GET', '/api/ping');
  return { estado, respuesta: json };
}

export async function diagnosticarConexion() {
  function detalle(error: unknown) {
    return error instanceof ApiError
      ? { codigo: error.codigo, estado: error.estado, mensaje: error.message }
      : {
          codigo: 'ERROR_INESPERADO',
          estado: null,
          mensaje: 'No se pudo completar el diagnóstico.'
        };
  }
  let eco;
  try {
    const r = await ping();
    eco =
      r.estado >= 200 && r.estado < 300
        ? { ok: true, ...r }
        : {
            ok: false,
            ...r,
            error: {
              codigo: 'ERROR_HTTP',
              estado: r.estado,
              mensaje: `/api/ping respondió HTTP ${r.estado}.`
            }
          };
  } catch (error) {
    eco = { ok: false, error: detalle(error) };
  }
  let autenticacion;
  try {
    autenticacion = { ok: true, usuario: await api('GET', '/api/auth/me') };
  } catch (error) {
    autenticacion = { ok: false, error: detalle(error) };
  }
  return { destino: destino(), ok: eco.ok && autenticacion.ok, ping: eco, autenticacion };
}

export function destino(): string {
  return config.baseUrl;
}
