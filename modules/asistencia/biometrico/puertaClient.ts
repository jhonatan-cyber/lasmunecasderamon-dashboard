import {
  construirAuthorizationDigest,
  DeviceAuthError,
  DeviceConnectionError,
  type CredencialesEquipo
} from './deviceClient';

const TIMEOUT_APERTURA_MS = 5000;

export interface AperturaPuerta {
  canal?: number;
  usuarioId?: string | null;
}

function parsearChallenge(header: string): Record<string, string> {
  const params: Record<string, string> = {};
  const re = /(\w+)=(?:"([^"]*)"|([^,]*))/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(header)) !== null) {
    params[match[1].toLowerCase()] = match[2] ?? match[3] ?? '';
  }
  return params;
}

export async function abrirPuerta(
  credenciales: CredencialesEquipo,
  opciones: AperturaPuerta = {}
): Promise<void> {
  const canal = Math.max(1, Math.trunc(opciones.canal ?? 1));
  const parametros = new URLSearchParams({
    action: 'openDoor',
    channel: String(canal),
    Type: 'Remote'
  });
  const usuarioId = (opciones.usuarioId ?? '').trim();
  if (usuarioId) parametros.set('UserID', usuarioId);

  const url = new URL(
    `/cgi-bin/accessControl.cgi?${parametros.toString()}`,
    `http://${credenciales.ip}`
  );
  const path = `${url.pathname}${url.search}`;
  const headers: Record<string, string> = { 'User-Agent': 'LasMunecasDeRamon/1.0' };

  const pedir = async (authHeader?: string): Promise<Response> => {
    const init: RequestInit = {
      method: 'GET',
      headers: authHeader ? { ...headers, Authorization: authHeader } : { ...headers },
      signal: AbortSignal.timeout(TIMEOUT_APERTURA_MS)
    };
    try {
      return await fetch(url, init);
    } catch (error) {
      throw new DeviceConnectionError(`No se pudo conectar al equipo en ${credenciales.ip}`, error);
    }
  };

  let response = await pedir();
  if (response.status === 401) {
    const header = response.headers.get('www-authenticate');
    if (!header || !header.toLowerCase().startsWith('digest')) {
      throw new DeviceConnectionError('El equipo no acepta autenticación Digest');
    }
    await response.body?.cancel().catch(() => undefined);
    response = await pedir(
      construirAuthorizationDigest('GET', path, credenciales, parsearChallenge(header))
    );
  }
  if (response.status === 401) {
    await response.body?.cancel().catch(() => undefined);
    throw new DeviceAuthError('Usuario o clave del equipo incorrectos');
  }
  if (!response.ok) {
    const texto = await response.text().catch(() => '');
    throw new DeviceConnectionError(
      `El equipo respondió ${response.status}: ${texto.substring(0, 200)}`
    );
  }

  const texto = (await response.text()).trim();
  if (!/^OK\b/i.test(texto)) {
    throw new DeviceConnectionError(
      `El equipo no abrió la puerta: ${texto.substring(0, 200) || '(sin respuesta)'}`
    );
  }
}
