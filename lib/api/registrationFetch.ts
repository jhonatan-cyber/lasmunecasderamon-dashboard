import { REGISTRATION_HEADER, isRegistrationMethod } from './registration-contract';
import { beginRegistration } from '@/lib/store/registrationStore';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Agrupa solo solicitudes iguales en vuelo. Una compra posterior confirmada es otra intencion. */
export function createRegistrationFetch(
  transport: typeof fetch,
  origin: string,
  storage?: StorageLike
): typeof fetch {
  const inFlight = new Map<string, Promise<Response>>();
  const uncertain = new Map<string, string>();
  const storageKey = (fingerprint: string) => `registration:${fingerprint}`;
  const readKey = (fingerprint: string) => {
    try {
      return storage?.getItem(storageKey(fingerprint)) ?? uncertain.get(fingerprint);
    } catch {
      return uncertain.get(fingerprint);
    }
  };
  const saveKey = (fingerprint: string, key?: string) => {
    if (key) uncertain.set(fingerprint, key);
    else uncertain.delete(fingerprint);
    try {
      if (key) storage?.setItem(storageKey(fingerprint), key);
      else storage?.removeItem(storageKey(fingerprint));
    } catch {
      /* Sigue protegido en memoria si el almacenamiento no esta disponible. */
    }
  };

  return async (input, init) => {
    const rawUrl = input instanceof Request ? input.url : String(input);
    const url = new URL(rawUrl, origin);
    const method = (
      init?.method ?? (input instanceof Request ? input.method : 'GET')
    ).toUpperCase();
    if (
      url.origin !== origin ||
      !url.pathname.startsWith('/api/') ||
      !isRegistrationMethod(method) ||
      /^\/api\/(auth|login|logout|notifications|cron|webhooks)(\/|$)/.test(url.pathname)
    ) {
      return transport(input, init);
    }
    const finish = beginRegistration();
    try {
      const request = new Request(input instanceof Request ? input : url.href, init);
      const contentType = request.headers.get('content-type') ?? '';
      let body: string;
      if (contentType.includes('multipart/form-data')) {
        const entries = await request.clone().formData();
        const fields = await Promise.all(
          [...entries].map(async ([name, value]) => [
            name,
            typeof value === 'string'
              ? value
              : [value.name, value.type, [...new Uint8Array(await value.arrayBuffer())]]
          ])
        );
        body = JSON.stringify(fields);
      } else {
        body = await request.clone().text();
      }
      // Solo se guarda una huella; nunca el contenido del registro en sessionStorage.
      const explicitKey =
        request.headers.get('x-idempotency-key') ??
        request.headers.get('idempotency-key') ??
        request.headers.get(REGISTRATION_HEADER) ??
        '';
      const signature = `${method} ${url.href}\n${request.headers.get('authorization') ?? ''}\n${explicitKey}\n${body}`;
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(signature));
      const fingerprint = [...new Uint8Array(digest)]
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      const existing = inFlight.get(fingerprint);
      if (existing) return (await existing).clone();
      const key = explicitKey || readKey(fingerprint) || crypto.randomUUID();
      const headers = new Headers(request.headers);
      // Las claves explicitas de la cola offline conservan su contrato existente.
      if (!headers.has('x-idempotency-key') && !headers.has('idempotency-key'))
        headers.set(REGISTRATION_HEADER, key);
      saveKey(fingerprint, key);
      const promise = transport(new Request(request, { headers }))
        .then(async response => {
          // Si se perdio la respuesta, o hay 5xx/409, conservar la misma clave al reintentar.
          if (response.status < 500) {
            try {
              const result = await response.clone().json();
              if (
                response.status !== 409 ||
                result?.code === 'IDEMPOTENCY_OWNER_MISMATCH' ||
                result?.code === 'IDEMPOTENCY_FALLIDA'
              )
                saveKey(fingerprint);
            } catch {
              /* Respuesta incompleta. */
            }
          }
          return response;
        })
        .finally(() => {
          inFlight.delete(fingerprint);
        });
      inFlight.set(fingerprint, promise);
      return (await promise).clone();
    } finally {
      finish();
    }
  };
}
