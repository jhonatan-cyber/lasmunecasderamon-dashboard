import {
  construirAuthorizationDigest,
  type CredencialesEquipo
} from '@/lib/biometric/deviceClient';
import { EventMultipartDecoder } from './eventMultipart';

export interface EventoDelEquipo {
  createTime: number;
  userId: string;
  tipo: string | null;
  status: number | null;
  metodo: number | null;
  code: string;
  raw: string;
}

function normalizar(campos: Record<string, unknown>, raw: string): EventoDelEquipo | null {
  const nested = campos.Data ?? campos.data;
  const data = nested && typeof nested === 'object' ? (nested as Record<string, unknown>) : {};
  const c = { ...campos, ...data };
  const code = String(campos.Code ?? campos.code ?? '');
  const userId = String(c.UserID ?? c.UserId ?? c.CardNo ?? c.User ?? '').trim();
  let createTime = Number(c.CreateTime ?? c.UTC ?? NaN);
  if (createTime > 1e12) createTime = Math.floor(createTime / 1000);
  if (code !== 'AccessControl' || !userId || !Number.isFinite(createTime) || createTime <= 0)
    return null;
  const number = (value: unknown) =>
    value != null && Number.isFinite(Number(value)) ? Number(value) : null;
  return {
    code,
    userId,
    createTime,
    tipo: c.Type == null ? null : String(c.Type),
    status: number(c.Status),
    metodo: number(c.Method),
    raw: raw.substring(0, 2000)
  };
}

export function extraerEventosDeChunk(chunk: string): EventoDelEquipo[] {
  const result: EventoDelEquipo[] = [];
  for (const part of chunk.split(/^--[^\r\n]*$/m)) {
    const body = part.replace(/^Content-[^\r\n]*$/gim, '').trim();
    if (!body) continue;
    if (body.startsWith('{')) {
      try {
        const object = JSON.parse(body);
        const events = Array.isArray(object.Events) ? object.Events : [object];
        for (const item of events) {
          const event = normalizar(item, body);
          if (event) result.push(event);
        }
      } catch {}
      continue;
    }
    const groups = new Map<string, Record<string, unknown>>();
    for (const line of body.split(/\r?\n/)) {
      if (/^Code=[^;]+;/.test(line)) {
        const jsonStart = line.indexOf(';data=');
        const prefix = jsonStart < 0 ? line : line.slice(0, jsonStart);
        const fields: Record<string, unknown> = {};
        for (const pair of prefix.split(';')) {
          const at = pair.indexOf('=');
          if (at > 0) fields[pair.slice(0, at)] = pair.slice(at + 1);
        }
        if (jsonStart >= 0) {
          try {
            fields.data = JSON.parse(line.slice(jsonStart + 6));
          } catch {
            continue;
          }
        }
        const event = normalizar(fields, line);
        if (event) result.push(event);
        continue;
      }
      const match = /^(?:Events\[(\d+)\]\.)?(?:Data\.)?(\w+)=(.*)$/.exec(line.trim());
      if (!match) continue;
      const key = match[1] ?? '0';
      const group = groups.get(key) ?? {};
      group[match[2]] = match[3];
      groups.set(key, group);
    }
    for (const group of groups.values()) {
      const event = normalizar(group, body);
      if (event) result.push(event);
    }
  }
  return result;
}

export function parsearBloqueEvento(bloque: string): EventoDelEquipo | null {
  return extraerEventosDeChunk(bloque)[0] ?? null;
}

export interface OpcionesListener {
  onEvento: (evento: EventoDelEquipo) => void | Promise<void>;
  onChunk?: (texto: string) => void;
  onError?: (error: unknown) => void;
  signal: AbortSignal;
}

export class EventManagerNoSoportadoError extends Error {
  constructor() {
    super('El equipo no soporta las suscripciones CGI de eventos');
    this.name = 'EventManagerNoSoportadoError';
  }
}

const PATHS = [
  '/cgi-bin/snapManager.cgi?action=attachFileProc&Flags[0]=Event&Events=[AccessControl]&heartbeat=5',
  '/cgi-bin/eventManager.cgi?action=attach&codes=[AccessControl]&heartbeat=5'
];

export async function abrirFlujoEventos(
  credenciales: CredencialesEquipo,
  opciones: OpcionesListener
): Promise<void> {
  let lastError: unknown = new EventManagerNoSoportadoError();
  for (const path of PATHS) {
    if (opciones.signal.aborted) throw new Error('Event subscription aborted');
    const abort = new AbortController();
    const stop = () => abort.abort();
    opciones.signal.addEventListener('abort', stop, { once: true });
    const timeout = setTimeout(stop, 10000);
    try {
      const url = new URL(path, `http://${credenciales.ip}`);
      const headers: Record<string, string> = { 'User-Agent': 'LasMunecasDeRamon/1.0' };
      let response = await fetch(url, { headers, signal: abort.signal });
      if (response.status === 401) {
        const challenge: Record<string, string> = {};
        const header = response.headers.get('www-authenticate') || '';
        await response.body?.cancel();
        if (!/^Digest /i.test(header)) throw new Error('Unsupported event authentication');
        for (const match of header.matchAll(/(\w+)=(?:"([^"]*)"|([^,]*))/g))
          challenge[match[1].toLowerCase()] = match[2] ?? match[3];
        headers.Authorization = construirAuthorizationDigest(
          'GET',
          url.pathname + url.search,
          credenciales,
          challenge
        );
        response = await fetch(url, { headers, signal: abort.signal });
      }
      if (!response.ok || !response.body) {
        await response.body?.cancel();
        if ([400, 404, 501].includes(response.status)) throw new EventManagerNoSoportadoError();
        throw new Error(`Event subscription HTTP ${response.status}`);
      }
      const contentType = response.headers.get('content-type') || '';
      const boundary = /boundary="?([^";\s]+)/i.exec(contentType)?.[1];
      if (!boundary) {
        await response.body.cancel();
        throw new Error('Event response is not multipart');
      }
      clearTimeout(timeout);
      const decoder = new EventMultipartDecoder(boundary);
      const reader = response.body.getReader();
      void (async () => {
        let idle: ReturnType<typeof setTimeout> | undefined;
        try {
          while (!abort.signal.aborted) {
            idle = setTimeout(stop, 20000);
            const { done, value } = await reader.read();
            clearTimeout(idle);
            if (done) throw new Error('Event connection closed');
            for (const text of decoder.push(value)) {
              try {
                opciones.onChunk?.(text);
              } catch {}
              for (const event of extraerEventosDeChunk(text)) await opciones.onEvento(event);
            }
          }
        } catch (error) {
          if (!opciones.signal.aborted) opciones.onError?.(error);
        } finally {
          clearTimeout(idle);
          abort.abort();
          await reader.cancel().catch(() => {});
          reader.releaseLock();
          opciones.signal.removeEventListener('abort', stop);
        }
      })();
      return;
    } catch (error) {
      lastError = error;
      abort.abort();
      opciones.signal.removeEventListener('abort', stop);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}
