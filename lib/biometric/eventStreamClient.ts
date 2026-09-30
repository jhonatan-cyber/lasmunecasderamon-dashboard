import { credencialesDeFila, type CredencialesEquipo } from '@/lib/biometric/deviceClient';

/**
 * Flujo en vivo del equipo: `eventManager.cgi?action=attach`.
 *
 * Esta es la vía TIEMPO REAL: el servidor abre UNA conexión HTTP persistente
 * hacia el equipo y el lector escribe cada verificación en el momento en que
 * ocurre (multipart con bloques `Events[i].Code=AccessControl`). La verificación
 * en la puerta es local del equipo; esta conexión solo TRASLADA el evento.
 *
 * Diferencias con las otras dos vías:
 *   - push a /dahua/push: el equipo llama al servidor (requiere URL pública).
 *   - poller (recordPoller): el servidor pregunta cada minuto (no es instantáneo).
 *   - ESTE listener: conexión viva, latencia sub-segundo, sin abrir nada al mundo.
 *
 * Nota: algunos firmwares también exponen `snapManager.cgi` para adjuntar
 * snapshots; el canal `AccessControl` de `eventManager.cgi` es el estándar de
 * los ASI y contiene todo lo que necesitamos (UserID, Method, Status, UTC).
 */

const LECTURA_TIMEOUT_MS = 90_000; // entre bloques hay heartbeat silencioso

export interface EventoDelEquipo {
  /** Epoch UTC en segundos del instante del evento. */
  createTime: number;
  userId: string;
  tipo: string | null; // Entry / Exit
  status: number | null; // 1 = verificación exitosa
  metodo: number | null; // 6 = huella, 15 = cara, 1 = tarjeta, 0 = clave
  code: string; // AccessControl, Heartbeat, etc.
  raw: string;
}

/**
 * Parsea un bloque del stream agrupando los parámetros `Events[i].Clave=Valor`
 * por índice de evento (el cuerpo multipart del attach los trae prefijados).
 */
export function parsearBloqueEvento(bloque: string): EventoDelEquipo | null {
  const eventos: EventoDelEquipo[] = [];
  const grupos = new Map<number, Record<string, string>>();
  for (const linea of bloque.split(/\r?\n/)) {
    const idx = linea.indexOf('=');
    if (idx <= 0) continue;
    const clave = linea.slice(0, idx).trim();
    const valor = linea.slice(idx + 1).trim();
    const m = clave.match(/^(?:Events\[(\d+)\]\.)?(\w+)$/);
    if (!m) continue;
    const indice = m[1] ? Number(m[1]) : 0;
    const campo = m[2];
    const grupo = grupos.get(indice) ?? {};
    grupo[campo] = valor;
    grupos.set(indice, grupo);
  }

  for (const campos of grupos.values()) {
    const code = campos['Code'] || campos['code'] || '';
    const createTime = Number(campos['CreateTime'] ?? campos['UTC'] ?? NaN);
    const userId = (campos['UserID'] ?? campos['CardNo'] ?? campos['User'] ?? '').trim();
    // Heartbeats y bloques sin persona no son eventos de verificación.
    if (code !== 'AccessControl' || !userId || !Number.isFinite(createTime)) continue;
    eventos.push({
      code,
      createTime,
      userId,
      tipo: campos['Type'] ?? null,
      status: campos['Status'] != null ? Number(campos['Status']) : null,
      metodo: campos['Method'] != null ? Number(campos['Method']) : null,
      raw: bloque.substring(0, 2000)
    });
  }

  return eventos[0] ?? null;
}

/**
 * Extrae TODOS los eventos de un chunk del stream multipart. Los grupos
 * `Events[i]` con varias verificaciones en un mismo bloque quedan todos.
 */
export function extraerEventosDeChunk(chunk: string): EventoDelEquipo[] {
  const eventos: EventoDelEquipo[] = [];
  const partes = chunk.split(/^--.*$/m);
  for (const parte of partes) {
    const cuerpo = parte.replace(/Content-[Tt]ype:[^\r\n]*\r?\n/, '').trim();
    if (!cuerpo) continue;
    // parsearBloqueEvento devuelve el primero del bloque; para múltiples
    // eventos reusamos el agrupado directo por índice.
    const grupos = new Map<number, Record<string, string>>();
    for (const linea of cuerpo.split(/\r?\n/)) {
      const idx = linea.indexOf('=');
      if (idx <= 0) continue;
      const clave = linea.slice(0, idx).trim();
      const valor = linea.slice(idx + 1).trim();
      const m = clave.match(/^(?:Events\[(\d+)\]\.)?(\w+)$/);
      if (!m) continue;
      const indice = m[1] ? Number(m[1]) : 0;
      const grupo = grupos.get(indice) ?? {};
      grupo[m[2]] = valor;
      grupos.set(indice, grupo);
    }
    for (const campos of grupos.values()) {
      const code = campos['Code'] || campos['code'] || '';
      const createTime = Number(campos['CreateTime'] ?? campos['UTC'] ?? NaN);
      const userId = (campos['UserID'] ?? campos['CardNo'] ?? campos['User'] ?? '').trim();
      if (code !== 'AccessControl' || !userId || !Number.isFinite(createTime)) continue;
      eventos.push({
        code,
        createTime,
        userId,
        tipo: campos['Type'] ?? null,
        status: campos['Status'] != null ? Number(campos['Status']) : null,
        metodo: campos['Method'] != null ? Number(campos['Method']) : null,
        raw: cuerpo.substring(0, 2000)
      });
    }
  }
  return eventos;
}

export interface OpcionesListener {
  onEvento: (evento: EventoDelEquipo) => void | Promise<void>;
  onError?: (error: unknown) => void;
  signal: AbortSignal;
}

/** Cuando el equipo NO soporta eventManager (404), el error lo marca. */
export class EventManagerNoSoportadoError extends Error {
  constructor() {
    super('El equipo no soporta eventManager.cgi (stream en vivo)');
    this.name = 'EventManagerNoSoportadoError';
  }
}

function construirAuthHeader(
  method: string,
  uri: string,
  credenciales: CredencialesEquipo,
  challenge: Record<string, string>
): string {
  // Reusa la construcción Digest del cliente (misma normativa RFC 2617).
  // Se importa acá para no duplicar la lógica de firma.

  const { construirAuthorizationDigest } =
    require('@/lib/biometric/deviceClient') as typeof import('@/lib/biometric/deviceClient');
  return construirAuthorizationDigest(method, uri, credenciales, challenge);
}

/**
 * Abre la conexión viva y consume el stream hasta que la aborten.
 * Resuelve cuando la conexión se estableció; los eventos llegan por `onEvento`.
 */
export async function abrirFlujoEventos(
  credenciales: CredencialesEquipo,
  opciones: OpcionesListener
): Promise<void> {
  const base = `http://${credenciales.ip}`;
  const path = '/cgi-bin/eventManager.cgi?action=attach&codes=[AccessControl]';
  const url = new URL(path, base);
  const uri = url.pathname + url.search;

  const headers: Record<string, string> = { 'User-Agent': 'LasMunecasDeRamon/1.0' };

  const hacerPedido = async (authHeader?: string): Promise<Response> => {
    const init: RequestInit = { method: 'GET', headers, signal: opciones.signal };
    if (authHeader) (init.headers as Record<string, string>)['Authorization'] = authHeader;
    return fetch(url, init);
  };

  let response = await hacerPedido().catch(error => {
    throw new Error(`No se pudo conectar al equipo en ${credenciales.ip}: ${String(error)}`);
  });

  if (response.status === 401) {
    const header = response.headers.get('www-authenticate');
    if (!header || !header.toLowerCase().startsWith('digest')) {
      throw new Error('El equipo no acepta autenticación Digest');
    }
    const params: Record<string, string> = {};
    const re = /(\w+)=(?:"([^"]*)"|([^,]*))/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(header)) !== null) {
      params[m[1].toLowerCase()] = m[2] ?? m[3] ?? '';
    }
    headers['Authorization'] = construirAuthHeader('GET', uri, credenciales, params);
    response = await hacerPedido();
  }

  if (response.status === 401) throw new Error('Usuario o clave del equipo incorrectos');
  if (response.status === 404 || response.status === 501) {
    throw new EventManagerNoSoportadoError();
  }
  if (!response.ok || !response.body) {
    throw new Error(`El equipo respondió ${response.status} al abrir el stream`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // El "resolve" ocurre al establecerse la conexión; la lectura continúa en
  // background hasta abort. Los errores de red suben para que el supervisor
  // reconecte con backoff.
  void (async () => {
    try {
      for (;;) {
        const { done, value } = await Promise.race([
          reader.read(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('stream inactivo')), LECTURA_TIMEOUT_MS)
          )
        ]);
        if (done) throw new Error('El equipo cerró el stream');
        buffer += decoder.decode(value, { stream: true });
        // Los bloques terminan en \r\n\r\n (o \n\n); procesamos lo completo.
        let corte: number;
        while ((corte = buscarCorte(buffer)) !== -1) {
          const bloque = buffer.slice(0, corte);
          buffer = buffer.slice(corte).replace(/^\r?\n\r?\n/, '');
          for (const evento of extraerEventosDeChunk(bloque)) {
            await opciones.onEvento(evento);
          }
        }
      }
    } catch (error) {
      if (!opciones.signal.aborted) opciones.onError?.(error);
      try {
        await reader.cancel();
      } catch {
        /* ya estaba cerrado */
      }
    }
  })();
}

function buscarCorte(buffer: string): number {
  const c1 = buffer.indexOf('\r\n\r\n');
  const c2 = buffer.indexOf('\n\n');
  if (c1 === -1) return c2;
  if (c2 === -1) return c1;
  return Math.min(c1, c2);
}
