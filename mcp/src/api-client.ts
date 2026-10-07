import { config } from './config.js';
import { siguientePaso } from './pasos.js';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface Sesion {
  token: string | null;
  refreshToken: string | null;
  expiraEn: number;
  renovacion?: Promise<string>;
}

const sesionLocal: Sesion = { token: null, refreshToken: null, expiraEn: 0 };
const contextoSesion = new AsyncLocalStorage<Sesion>();
export const conSesion = <T>(sesion: Sesion, accion: () => T): T =>
  contextoSesion.run(sesion, accion);
const sesionActual = () => contextoSesion.getStore() ?? sesionLocal;

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

export function sesionDelDashboard(token: string, refreshToken: string): Sesion {
  return { token, refreshToken, expiraEn: expiracionDelJwt(token) };
}

async function bruto(
  metodo: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
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
  // Sólo GET reintenta: es idempotente por definición, mientras que un POST
  // puede mover dinero y un reintento duplicaría la operación.
  const maxIntentos = metodo === 'GET' ? Math.max(1, config.reintentos) : 1;
  let respuesta: Response;
  for (let intento = 1; ; intento++) {
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
      if (intento < maxIntentos) {
        await esperarReintento(intento);
        continue;
      }
      throw errorDeRed(error);
    }
    // 408/429/5xx son transitorios: el backend puede volver en el siguiente intento.
    const transitorio =
      respuesta.status === 408 || respuesta.status === 429 || respuesta.status >= 500;
    if (intento < maxIntentos && transitorio) {
      try {
        await respuesta.body?.cancel();
      } catch {
        /* cuerpo descartado, no hay nada que conservar */
      }
      await esperarReintento(intento);
      continue;
    }
    break;
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

/** Error de red con el código que corresponde al tipo de fallo. */
function errorDeRed(error: unknown): ApiError {
  const e = error as Error & { cause?: { code?: string } };
  const timeout = e?.name === 'TimeoutError' || e?.name === 'AbortError';
  const rechazado = e?.cause?.code === 'ECONNREFUSED';
  return new ApiError(
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

/** Backoff exponencial con jitter: `base * 2^(intento-1)` + hasta una base más. */
function esperarReintento(intento: number): Promise<void> {
  if (config.reintentoBaseMs <= 0) return Promise.resolve();
  const espera = config.reintentoBaseMs * 2 ** (intento - 1) + Math.random() * config.reintentoBaseMs;
  return new Promise(resolve => setTimeout(resolve, espera));
}

async function iniciarSesion(): Promise<void> {
  if (contextoSesion.getStore()) {
    throw new ApiError(
      'La sesión del dashboard expiró. Vuelve a autorizar el MCP.',
      401,
      undefined,
      'SESION_RECHAZADA'
    );
  }
  const sesion = sesionActual();
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

type Renovacion = 'renovada' | 'invalida' | 'transitoria';

async function renovar(): Promise<Renovacion> {
  const sesion = sesionActual();
  if (!sesion.refreshToken) return 'invalida';
  let resultado: { estado: number; json: any };
  try {
    resultado = await bruto('POST', '/api/auth/refresh', {
      cabeceras: { 'x-refresh-token': sesion.refreshToken }
    });
  } catch (error) {
    if (error instanceof ApiError) return 'transitoria';
    throw error;
  }
  const { estado, json } = resultado;
  if (estado !== 200 || !json?.token) {
    // Solo el 401 descarta el refresh token: un 5xx o un corte de red no invalidan la sesión.
    if (estado !== 401) return 'transitoria';
    sesion.refreshToken = null;
    return 'invalida';
  }
  sesion.token = json.token as string;
  sesion.refreshToken = (json.refreshToken as string | undefined) ?? sesion.refreshToken;
  sesion.expiraEn = expiracionDelJwt(json.token);
  return 'renovada';
}

async function autenticar(): Promise<string> {
  const sesion = sesionActual();
  const margen = Date.now() + 30_000;
  if (sesion.token && sesion.expiraEn > margen) return sesion.token;
  if (sesion.renovacion) return sesion.renovacion;
  sesion.renovacion = (async () => {
    if (sesion.refreshToken) {
      const renovacion = await renovar();
      if (renovacion === 'renovada') return sesion.token!;
      if (renovacion === 'transitoria') {
        throw new ApiError(
          'El dashboard no respondió al renovar la sesión. Reintenta en unos segundos.',
          null,
          undefined,
          'REFRESH_FALLIDO'
        );
      }
    }
    await iniciarSesion();
    return sesion.token!;
  })();
  try {
    return await sesion.renovacion;
  } finally {
    delete sesion.renovacion;
  }
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
  metodo: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  ruta: string,
  opciones: {
    query?: Record<string, string | number | undefined>;
    cuerpo?: unknown;
    /** Cabeceras propias de la operación, p. ej. x-idempotency-key. */
    cabeceras?: Record<string, string>;
  } = {}
): Promise<T> {
  const sesion = sesionActual();
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

  // La clave de idempotencia viaja siempre: se reintenta contra el mismo token
  // de intención, o el backend trataría el reintento como una operación nueva.
  const conToken = () => ({
    ...opciones,
    cabeceras: { ...opciones.cabeceras, Authorization: `Bearer ${token}` }
  });

  let { estado, json } = await bruto(metodo, ruta, conToken());

  if (estado === 401) {
    sesion.token = null;
    token = await autenticar();
    ({ estado, json } = await bruto(metodo, ruta, conToken()));
  }

  if (estado >= 400) {
    throw new ApiError(
      `${metodo} ${ruta} falló (${estado}): ${json?.message ?? json?.error ?? 'sin detalle'}`,
      estado,
      json,
      estado === 403 ? 'PERMISOS_INSUFICIENTES' : estado === 401 ? 'SESION_RECHAZADA' : 'ERROR_HTTP'
    );
  }
  if (json?.success === false) {
    throw new ApiError(json.message ?? json.error ?? 'La operación no se completó.', estado, json, 'OPERACION_RECHAZADA');
  }
  return desenvolver(json) as T;
}

export async function ping() {
  const token = sesionActual().token;
  const { estado, json } = await bruto('GET', '/api/ping', {
    ...(token ? { cabeceras: { Authorization: `Bearer ${token}` } } : {})
  });
  return { estado, respuesta: json };
}

export async function diagnosticarConexion() {
  function detalle(error: unknown) {
    const base =
      error instanceof ApiError
        ? { codigo: error.codigo, estado: error.estado, mensaje: error.message }
        : {
            codigo: 'ERROR_INESPERADO',
            estado: null as number | null,
            mensaje: 'No se pudo completar el diagnóstico.'
          };
    // Mismo contrato que las herramientas: código, estado, mensaje y paso.
    return { ...base, siguientePaso: siguientePaso(base.codigo) };
  }
  let autenticacion;
  try {
    autenticacion = { ok: true, usuario: await api('GET', '/api/auth/me') };
  } catch (error) {
    autenticacion = { ok: false, error: detalle(error) };
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
              mensaje: `/api/ping respondió HTTP ${r.estado}.`,
              siguientePaso: siguientePaso('ERROR_HTTP')
            }
          };
  } catch (error) {
    eco = { ok: false, error: detalle(error) };
  }
  return { destino: destino(), ok: eco.ok && autenticacion.ok, ping: eco, autenticacion };
}

export function destino(): string {
  return config.baseUrl;
}
