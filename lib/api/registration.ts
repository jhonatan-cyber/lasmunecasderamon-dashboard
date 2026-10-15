import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { REGISTRATION_HEADER, isRegistrationMethod } from './registration-contract';
import { isValidIdempotencyKey, runIdempotent } from './idempotency';

/** Se ejecuta despues de autenticar y autorizar; una repeticion nunca evita esos controles. */
export async function runRegistration(
  request: Request,
  usuarioId: string,
  handler: (request: Request) => Promise<Response>
): Promise<Response> {
  const key = request.headers.get(REGISTRATION_HEADER);
  if (!key || !isRegistrationMethod(request.method)) return handler(request);
  if (!isValidIdempotencyKey(key)) {
    return NextResponse.json(
      { success: false, message: 'Clave de registro invalida' },
      { status: 400 }
    );
  }
  const url = new URL(request.url);
  const scope = createHash('sha256')
    .update(`${request.method} ${url.pathname}${url.search}`)
    .digest('hex');
  const headers = new Headers(request.headers);
  headers.delete(REGISTRATION_HEADER);
  headers.delete('idempotency-key');
  headers.set('x-idempotency-key', key);
  const guarded = new Request(request, { headers });
  return runIdempotent(
    guarded,
    { endpoint: `web.${request.method}.${scope}`, usuarioId },
    async () => {
      // Evita reclamar dos veces la misma intencion en rutas que ya usan runIdempotent.
      const cleanHeaders = new Headers(guarded.headers);
      cleanHeaders.delete('x-idempotency-key');
      return handler(new Request(guarded, { headers: cleanHeaders }));
    }
  );
}
