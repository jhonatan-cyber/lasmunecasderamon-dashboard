import type RedisClient from 'ioredis';
import { randomUUID } from 'node:crypto';
import { isSseEventType, type SseEventType } from './sseEvents';
import { redisNamespace } from '@/lib/cache/redisKeys';
import { logger } from '@/lib/utils/logger';

const RETRY_DELAY_MS = 5000;

/**
 * Manejador local: recibe un evento publicado por otra instancia y lo reparte entre
 * los clientes conectados a este proceso.
 */
export type SseBusHandler = (type: SseEventType, data: any, timestamp: string) => void;

/** Envoltorio que viaja por Redis. `origin` evita reprocesar el evento en su emisor. */
interface BusEnvelope {
  type: SseEventType;
  data: any;
  timestamp: string;
  origin: string;
}

interface BusState {
  instanceId: string;
  handler: SseBusHandler | null;
  publisher: RedisClient | null;
  subscriber: RedisClient | null;
  connecting: Promise<RedisClient | null> | null;
  retryAt: number;
}

// El estado vive en `globalThis` para sobrevivir al hot reload de Next.js y no
// acumular conexiones duplicadas.
function state(): BusState {
  const globalState = globalThis as unknown as { __sseBus?: BusState };
  if (!globalState.__sseBus) {
    globalState.__sseBus = {
      instanceId: randomUUID(),
      handler: null,
      publisher: null,
      subscriber: null,
      connecting: null,
      retryAt: 0
    };
  }
  return globalState.__sseBus;
}

// Los eventos no cruzan de base de datos: el canal incluye el namespace de PostgreSQL.
const CHANNEL = `lmr:sse:v1:${redisNamespace()}:events`;

/** Canal compartido; expuesto para diagnóstico y pruebas. */
export function sseBusChannel(): string {
  return CHANNEL;
}

/**
 * El bus solo se activa cuando `REDIS_URL` está configurado. Sin él, los eventos se
 * reparten solo en la instancia local (comportamiento de un único servidor), sin abrir
 * conexiones persistentes a un Redis inexistente.
 */
function disabled(): boolean {
  return !process.env.REDIS_URL;
}

function fail(): void {
  const current = state();
  current.publisher?.disconnect();
  current.subscriber?.disconnect();
  current.publisher = null;
  current.subscriber = null;
  current.retryAt = Date.now() + RETRY_DELAY_MS;
}

function receive(raw: string): void {
  const current = state();
  try {
    const envelope = JSON.parse(raw) as Partial<BusEnvelope>;
    if (!envelope || typeof envelope !== 'object') return;
    // El emisor ya entregó el evento localmente; reprocesarlo lo duplicaría.
    if (envelope.origin === current.instanceId) return;
    if (typeof envelope.type !== 'string' || !isSseEventType(envelope.type)) return;
    current.handler?.(envelope.type, envelope.data, envelope.timestamp ?? '');
  } catch {
    // Mensaje ajeno o malformado: se ignora.
  }
}

async function connection(): Promise<RedisClient | null> {
  const current = state();
  if (current.connecting) return current.connecting;
  if (current.publisher?.status === 'ready' && current.subscriber?.status === 'ready') {
    return current.publisher;
  }
  if (Date.now() < current.retryAt) return null;

  current.connecting = (async () => {
    let publisher: RedisClient | null = null;
    let subscriber: RedisClient | null = null;
    try {
      const Redis = (await import('ioredis')).default;
      const options = {
        lazyConnect: true,
        enableOfflineQueue: false,
        connectTimeout: 1000,
        commandTimeout: 1000,
        maxRetriesPerRequest: 0,
        retryStrategy: () => null,
        autoResendUnfulfilledCommands: false
      } as const;

      publisher = new Redis(process.env.REDIS_URL!, options);
      subscriber = new Redis(process.env.REDIS_URL!, options);
      publisher.on('error', () => {});
      subscriber.on('error', () => {});

      await publisher.connect();
      await subscriber.connect();
      subscriber.on('message', (_channel: string, raw: string) => receive(raw));
      await subscriber.subscribe(CHANNEL);

      current.publisher = publisher;
      current.subscriber = subscriber;
      logger.info('[SSEBus] Redis pub/sub activo; eventos compartidos entre instancias');
      return publisher;
    } catch {
      publisher?.disconnect();
      subscriber?.disconnect();
      current.retryAt = Date.now() + RETRY_DELAY_MS;
      logger.info('[SSEBus] Redis no disponible; eventos SSE solo en esta instancia');
      return null;
    }
  })();

  try {
    return await current.connecting;
  } finally {
    current.connecting = null;
  }
}

/**
 * Registra el manejador local y se suscribe al canal compartido. Las instancias que
 * sirven clientes SSE deben llamarlo una vez.
 */
export function startSseBus(handler: SseBusHandler): void {
  state().handler = handler;
  if (disabled()) return;
  void connection();
}

/** Espera a que el bus esté conectado (o a que se confirme que está desactivado). */
export async function waitForSseBus(): Promise<void> {
  if (disabled()) return;
  await connection();
}

/** Publica un evento para las demás instancias. No bloquea la entrega local. */
export function publishSseEvent(type: SseEventType, data: any, timestamp: string): void {
  if (disabled()) return;
  const envelope: BusEnvelope = { type, data, timestamp, origin: state().instanceId };
  const payload = JSON.stringify(envelope);

  void (async () => {
    const client = await connection();
    if (!client) return;
    try {
      await client.publish(CHANNEL, payload);
    } catch {
      fail();
    }
  })();
}

/** Libera las conexiones. Pensado para pruebas y apagado ordenado. */
export function stopSseBus(): void {
  const current = state();
  current.handler = null;
  current.publisher?.disconnect();
  current.subscriber?.disconnect();
  current.publisher = null;
  current.subscriber = null;
  current.connecting = null;
  current.retryAt = 0;
}
