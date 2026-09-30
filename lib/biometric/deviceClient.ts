import crypto from 'crypto';
import { descifrarSecreto } from '@/lib/biometric/credencialesCrypto';

/**
 * Cliente Dahua por IP — CGI oficial de los terminales ASI/ASA.
 *
 * A diferencia del push (`/dahua/push`), acá el SERVIDOR inicia la conexión:
 *   - Autenticación: HTTP Digest con el usuario/clave CGI del equipo.
 *   - Cara:   POST /cgi-bin/FaceInfoManager.cgi?action=add  (JSON: PhotoData base64)
 *             GET  /cgi-bin/FaceInfoManager.cgi?action=startFind + doFind (lectura)
 *   - Huella: /cgi-bin/FingerPrintManager.cgi?action=add|get (plantilla en hex)
 *
 * La plantilla/foto se traslada TAL CUAL: el sistema nunca re-codifica lo que
 * el equipo produce, porque el algoritmo de cotejo es propietario de Dahua.
 */

export interface CredencialesEquipo {
  ip: string;
  usuario: string;
  clave: string; // ya descifrada
}

const CGI_TIMEOUT_MS = 8000;

export class DeviceConnectionError extends Error {
  readonly causa?: unknown;
  constructor(mensaje: string, causa?: unknown) {
    super(mensaje);
    this.name = 'DeviceConnectionError';
    this.causa = causa;
  }
}

function parsearAuthHeader(header: string): Record<string, string> {
  const params: Record<string, string> = {};
  const re = /(\w+)=(?:"([^"]*)"|([^,]*))/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(header)) !== null) {
    params[match[1].toLowerCase()] = match[2] ?? match[3] ?? '';
  }
  return params;
}

function md5Hex(valor: string): string {
  return crypto.createHash('md5').update(valor).digest('hex');
}

/**
 * Construye el header `Authorization: Digest ...` exactamente como lo espera
 * RFC 2617 con MD5 + qop=auth (lo que usan los CGI de Dahua). Se calcula sobre
 * la MISMA uri y method del pedido original (el nonce/cnonce van del challenge).
 */
export function construirAuthorizationDigest(
  method: string,
  uri: string,
  credenciales: { usuario: string; clave: string },
  challenge: Record<string, string>
): string {
  const nonce = challenge['nonce'] || '';
  const realm = challenge['realm'] || '';
  const qop = (challenge['qop'] || '').split(',')[0].trim(); // suele ser "auth"
  const algorithm = (challenge['algorithm'] || 'MD5').toUpperCase();

  const ha1 =
    algorithm === 'MD5-SESS'
      ? md5Hex(
          `${md5Hex(`${credenciales.usuario}:${realm}:${credenciales.clave}`)}:${nonce}:cnonce`
        )
      : md5Hex(`${credenciales.usuario}:${realm}:${credenciales.clave}`);
  const ha2 = md5Hex(`${method}:${uri}`);

  let response: string;
  const partes: string[] = [
    `username="${credenciales.usuario}"`,
    `realm="${realm}"`,
    `nonce="${nonce}"`,
    `uri="${uri}"`,
    `algorithm=${algorithm}`
  ];
  if (qop) {
    const cnonce = crypto.randomBytes(8).toString('hex');
    const nc = '00000001';
    response = md5Hex(`${ha1}:${nonce}:${nc}:${cnonce}:auth:${ha2}`);
    partes.push(`response="${response}"`, `qop=auth`, `nc=${nc}`, `cnonce="${cnonce}"`);
  } else {
    response = md5Hex(`${ha1}:${nonce}:${ha2}`);
    partes.push(`response="${response}"`);
  }
  if (challenge['opaque']) partes.push(`opaque="${challenge['opaque']}"`);
  return `Digest ${partes.join(', ')}`;
}

type Metodo = 'GET' | 'POST';

async function cgi(
  credenciales: CredencialesEquipo,
  metodo: Metodo,
  path: string,
  opciones: { body?: string; contentType?: string } = {}
): Promise<string> {
  const base = `http://${credenciales.ip}`;
  const url = new URL(path, base);
  const pathConQuery = `${url.pathname}${url.search}`;

  const headers: Record<string, string> = {
    // Algunos firmware rechazan pedidos sin User-Agent reconocible.
    'User-Agent': 'LasMunecasDeRamon/1.0'
  };
  if (opciones.body !== undefined)
    headers['Content-Type'] = opciones.contentType || 'application/json';

  const pedido = async (authHeader?: string): Promise<Response> => {
    const signal = AbortSignal.timeout(CGI_TIMEOUT_MS);
    const init: RequestInit = { method: metodo, headers: { ...headers }, signal };
    if (opciones.body !== undefined) init.body = opciones.body;
    if (authHeader) (init.headers as Record<string, string>)['Authorization'] = authHeader;
    return fetch(url, init);
  };

  // 1) pedido sin auth → 401 con WWW-Authenticate (challenge Digest)
  let response: Response;
  try {
    response = await pedido();
  } catch (error) {
    throw new DeviceConnectionError(`No se pudo conectar al equipo en ${credenciales.ip}`, error);
  }

  // 2) pedido con Authorization calculado del challenge
  if (response.status === 401) {
    const header = response.headers.get('www-authenticate');
    if (!header || !header.toLowerCase().startsWith('digest')) {
      throw new DeviceConnectionError('El equipo no acepta autenticación Digest');
    }
    const challenge = parsearAuthHeader(header);
    const auth = construirAuthorizationDigest(metodo, pathConQuery, credenciales, challenge);
    try {
      response = await pedido(auth);
    } catch (error) {
      throw new DeviceConnectionError(`No se pudo conectar al equipo en ${credenciales.ip}`, error);
    }
  }

  if (response.status === 401) {
    throw new DeviceConnectionError('Usuario o clave del equipo incorrectos');
  }
  const texto = await response.text();
  if (!response.ok) {
    throw new DeviceConnectionError(
      `El equipo respondió ${response.status}: ${texto.substring(0, 200)}`
    );
  }
  return texto;
}

async function cgiGet(credenciales: CredencialesEquipo, path: string): Promise<string> {
  return cgi(credenciales, 'GET', path);
}

async function cgiPostJson(
  credenciales: CredencialesEquipo,
  path: string,
  body: unknown
): Promise<string> {
  return cgi(credenciales, 'POST', path, {
    body: JSON.stringify(body),
    contentType: 'application/json'
  });
}

/** Respuesta estilo `tabla=CGLLog\nresult=OK\n...` de los CGI clásicos. */
export function parsearTablaCGI(texto: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const linea of texto.split(/\r?\n/)) {
    const idx = linea.indexOf('=');
    if (idx > 0) out[linea.slice(0, idx).trim()] = linea.slice(idx + 1).trim();
  }
  return out;
}

function jsonOTexto(texto: string): unknown {
  const limpio = texto.trim();
  if (limpio.startsWith('{') || limpio.startsWith('[')) {
    try {
      return JSON.parse(limpio);
    } catch {
      /* cae a texto */
    }
  }
  return texto;
}

export interface InfoEquipo {
  modelo: string;
  serial: string;
  version: string;
}

/** Ping + identidad: `magicBox.cgi?action=getSystemInfo`. Falla si no hay red/credenciales. */
export async function verificarConexion(credenciales: CredencialesEquipo): Promise<InfoEquipo> {
  const texto = await cgiGet(credenciales, '/cgi-bin/magicBox.cgi?action=getSystemInfo');
  const tabla = parsearTablaCGI(texto);
  const serial =
    tabla['serial'] || tabla['SerialNumber'] || tabla['deviceID'] || tabla['DeviceID'] || '';
  if (!serial) {
    throw new DeviceConnectionError('El equipo no devolvió su serial (¿modelo no soportado?)');
  }
  return {
    modelo: tabla['deviceType'] || tabla['DeviceType'] || 'desconocido',
    serial,
    version: tabla['softwareVersion'] || tabla['SoftwareVersion'] || ''
  };
}

/**
 * Cara por foto: `FaceInfoManager.cgi?action=add` con PhotoData base64 (JSON).
 * El firmware extrae la plantilla de la imagen; después se puede leer de vuelta
 * con leerCara para confirmar que quedó cargada.
 */
export async function subirCara(
  credenciales: CredencialesEquipo,
  userId: string,
  nombre: string,
  fotoJpegBase64: string
): Promise<void> {
  const body = {
    UserID: userId,
    Info: {
      UserName: nombre,
      PhotoData: [fotoJpegBase64]
    }
  };
  const respuesta = await cgiPostJson(
    credenciales,
    '/cgi-bin/FaceInfoManager.cgi?action=add',
    body
  );
  const r = jsonOTexto(respuesta);
  if (typeof r === 'string' && !r.includes('OK') && r !== '') {
    throw new DeviceConnectionError(`El equipo rechazó la cara: ${r.substring(0, 200)}`);
  }
}

export interface CaraLeida {
  fotoBase64: string;
}

/** Lee la cara de vuelta: startFind → doFind con condición UserID. */
export async function leerCara(
  credenciales: CredencialesEquipo,
  userId: string
): Promise<CaraLeida | null> {
  const inicio = parsearTablaCGI(
    await cgiGet(credenciales, '/cgi-bin/FaceInfoManager.cgi?action=startFind')
  );
  const token = inicio['token'] || inicio['Token'];
  if (!token) throw new DeviceConnectionError('El equipo no devolvió token de búsqueda de caras');

  const condicion = encodeURIComponent(`{"UserInfo":{"UserID":"${userId}"}}`);
  const fin = await cgiGet(
    credenciales,
    `/cgi-bin/FaceInfoManager.cgi?action=doFind&token=${encodeURIComponent(token)}&condition=${condicion}`
  );
  const r = jsonOTexto(fin);
  if (!r || typeof r === 'string') return null;
  const obj = r as Record<string, unknown>;
  const info = (obj['Info'] ?? obj) as Record<string, unknown>;
  const fotos = info['PhotoData'] as unknown;
  if (Array.isArray(fotos) && typeof fotos[0] === 'string' && fotos[0]) {
    return { fotoBase64: fotos[0] };
  }
  return null;
}

export interface HuellaLeida {
  plantillaHex: string;
}

/**
 * Huella: `FingerPrintManager.cgi?action=add` (plantilla hex que devuelve el
 * propio equipo al enrolar) y `action=get` para leerla de vuelta. Si el modelo
 * no expone FingerPrintManager, el error sube y la UI lo muestra como
 * "huella no soportada por este equipo" en vez de fingir éxito.
 */
export async function subirHuella(
  credenciales: CredencialesEquipo,
  userId: string,
  plantillaHex: string
): Promise<void> {
  const body = { UserID: userId, FingerPrintData: [plantillaHex] };
  const respuesta = await cgiPostJson(
    credenciales,
    '/cgi-bin/FingerPrintManager.cgi?action=add',
    body
  );
  const r = jsonOTexto(respuesta);
  if (typeof r === 'string' && !r.includes('OK') && r !== '') {
    throw new DeviceConnectionError(`El equipo rechazó la huella: ${r.substring(0, 200)}`);
  }
}

export async function leerHuella(
  credenciales: CredencialesEquipo,
  userId: string
): Promise<HuellaLeida | null> {
  const texto = await cgiGet(
    credenciales,
    `/cgi-bin/FingerPrintManager.cgi?action=get&UserID=${encodeURIComponent(userId)}`
  );
  const r = jsonOTexto(texto);
  if (r && typeof r === 'object') {
    const obj = r as Record<string, unknown>;
    const datos = obj['FingerPrintData'] as unknown;
    if (Array.isArray(datos) && typeof datos[0] === 'string' && datos[0]) {
      return { plantillaHex: datos[0] };
    }
  }
  return null;
}

/**
 * Baja un usuario del equipo (usuario + cara + huella). Se usa cuando la
 * persona se elimina o se revoca su enrolamiento.
 */
export async function eliminarUsuarioDelEquipo(
  credenciales: CredencialesEquipo,
  userId: string
): Promise<void> {
  await cgiGet(
    credenciales,
    `/cgi-bin/recordUpdater.cgi?action=remove&name=AccessControlCard&UserID=${encodeURIComponent(userId)}`
  ).catch(() => undefined); // si no existe, no es error
  await cgiPostJson(credenciales, '/cgi-bin/FaceInfoManager.cgi?action=delete', {
    UserID: userId
  }).catch(() => undefined);
  await cgiPostJson(credenciales, '/cgi-bin/FingerPrintManager.cgi?action=delete', {
    UserID: userId
  }).catch(() => undefined);
}

/**
 * Enrolamiento EN EL EQUIPO de huella: algunos firmware aceptan disparar la
 * captura remota y devolver la plantilla por HTTP. Si el modelo lo soporta,
 * subirHuellaDirecto reemplaza el flujo del menú del equipo. Los que no,
 * responden error y el flujo cae al enrolamiento en el menú del equipo.
 */
export async function capturarHuellaEnEquipo(
  credenciales: CredencialesEquipo,
  userId: string
): Promise<HuellaLeida | null> {
  // FingerPrintManager.cgi?action=add sin FingerPrintData pide al equipo
  // iniciar la captura con el lector del propio terminal.
  const respuesta = await cgiGet(
    credenciales,
    `/cgi-bin/FingerPrintManager.cgi?action=add&UserID=${encodeURIComponent(userId)}`
  );
  const r = jsonOTexto(respuesta);
  if (r && typeof r === 'object') {
    const obj = r as Record<string, unknown>;
    const datos = obj['FingerPrintData'] as unknown;
    if (Array.isArray(datos) && typeof datos[0] === 'string' && datos[0]) {
      return { plantillaHex: datos[0] };
    }
  }
  return null;
}

/** Descifra las credenciales guardadas en la fila del dispositivo. */
export function credencialesDeFila(fila: {
  ip: string | null;
  usuario_equipo: string | null;
  clave_cifrada: string | null;
}): CredencialesEquipo | null {
  if (!fila.ip || !fila.usuario_equipo || !fila.clave_cifrada) return null;
  return {
    ip: fila.ip,
    usuario: fila.usuario_equipo,
    clave: descifrarSecreto(fila.clave_cifrada)
  };
}

export interface RecordAcceso {
  recNo: number;
  /** Epoch UTC en segundos que reporta el equipo. */
  createTime: number;
  userId: string;
  tipo: string | null; // Entry / Exit
  status: number | null; // 1 = verificación exitosa
  metodo: number | null; // 6 = huella, 15 = cara, 1 = tarjeta, 0 = clave
}

/**
 * Baja los registros acumulados del equipo: `recordFinder.cgi` sobre
 * `AccessControlCardRec` (documentado en la Integration Instruction oficial).
 * Devuelve solo los `count` más recientes; el poller deduplica por RecNo, así
 * que releer los últimos registros es barato e inocuo.
 */
export async function leerRegistrosAcceso(
  credenciales: CredencialesEquipo,
  count = 200
): Promise<RecordAcceso[]> {
  const texto = await cgiGet(
    credenciales,
    `/cgi-bin/recordFinder.cgi?action=find&name=AccessControlCardRec&count=${count}`
  );
  const r = jsonOTexto(texto);
  if (!r || typeof r === 'string') return [];
  const obj = r as Record<string, unknown>;
  const records = obj['records'] as unknown;
  if (!Array.isArray(records)) return [];

  const out: RecordAcceso[] = [];
  for (const item of records) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const recNo = Number(rec['RecNo'] ?? rec['recNo'] ?? NaN);
    const createTime = Number(rec['CreateTime'] ?? rec['createTime'] ?? NaN);
    const userId = String(rec['UserID'] ?? rec['userId'] ?? '').trim();
    if (!Number.isFinite(recNo) || !Number.isFinite(createTime) || !userId) continue;
    out.push({
      recNo,
      createTime,
      userId,
      tipo: rec['Type'] != null ? String(rec['Type']) : null,
      status: rec['Status'] != null ? Number(rec['Status']) : null,
      metodo: rec['Method'] != null ? Number(rec['Method']) : null
    });
  }
  return out;
}
