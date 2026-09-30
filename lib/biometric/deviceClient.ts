import crypto from 'crypto';
import { descifrarSecreto } from '@/lib/biometric/credencialesCrypto';
import { normalizarMac } from '@/lib/biometric/discovery';

/**
 * Cliente Dahua por IP — CGI oficial de los terminales ASI/ASA.
 *
 * A diferencia del push (`/dahua/push`), acá el SERVIDOR inicia la conexión:
 *   - Autenticación: HTTP Digest con el usuario/clave CGI del equipo.
 *   - Cara: GET /cgi-bin/FaceInfoManager.cgi?action=startFind + doFind (lectura,
 *           JSON PascalCase: `{ "Token": N, "Total": M }`).
 *   - Huella: /cgi-bin/FingerPrintManager.cgi (plantilla en hex), si el modelo lo expone.
 *
 * LIMITACIÓN CONFIRMADA contra un DHI-ASI3213A-W: los CGI de ESCRITURA de
 * personas no están implementados en ese firmware. `FaceInfoManager.cgi?action=add`
 * y `recordUpdater.cgi?action=insert&name=AccessControlCard` responden
 * `Error Bad Request!` con cualquier payload documentado, y
 * `FingerPrintManager.cgi` responde `Not Implemented!`. La web del propio equipo
 * usa otro transporte (`POST /RPC2`, JSON-RPC con sesión y cifrado propio del
 * firmware) para `AccessUser.insertMulti`. Por eso el enrolamiento real es
 * "la persona se captura EN el equipo y nosotros la leemos"; las funciones de
 * subida quedan para los modelos que sí las soportan.
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

/**
 * Pedido CGI con autenticación Digest resuelta (handler compartido por texto y
 * binario). Los equipos solo ofrecen HTTP plano en la red local.
 */
async function cgi(
  credenciales: CredencialesEquipo,
  metodo: Metodo,
  path: string,
  opciones: { body?: string; contentType?: string } = {}
): Promise<Response> {
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
  if (!response.ok) {
    const texto = await response.text();
    throw new DeviceConnectionError(
      `El equipo respondió ${response.status}: ${texto.substring(0, 200)}`
    );
  }
  return response;
}

async function cgiTexto(
  credenciales: CredencialesEquipo,
  metodo: Metodo,
  path: string,
  opciones: { body?: string; contentType?: string } = {}
): Promise<string> {
  return (await cgi(credenciales, metodo, path, opciones)).text();
}

async function cgiGet(credenciales: CredencialesEquipo, path: string): Promise<string> {
  return cgiTexto(credenciales, 'GET', path);
}

async function cgiPostJson(
  credenciales: CredencialesEquipo,
  path: string,
  body: unknown
): Promise<string> {
  return cgiTexto(credenciales, 'POST', path, {
    body: JSON.stringify(body),
    contentType: 'application/json'
  });
}

/**
 * Foto actual de la cámara del lector: `snapshot.cgi?channel=1` devuelve un JPEG
 * (640x360 en el ASI3213A-W). Es lo único que el equipo entrega de su cámara:
 * NO existe CGI para disparar una captura de enrolamiento ni para subir caras.
 */
export async function capturarFotoDelEquipo(
  credenciales: CredencialesEquipo
): Promise<{ base64: string; contentType: string }> {
  const response = await cgi(credenciales, 'GET', '/cgi-bin/snapshot.cgi?channel=1');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    throw new DeviceConnectionError('El equipo devolvió una imagen vacía');
  }
  return {
    base64: buffer.toString('base64'),
    contentType: response.headers.get('content-type') || 'image/jpeg'
  };
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

/** Busca una clave en la tabla CGI sin importar mayúsculas/minúsculas. */
function campoCI(tabla: Record<string, string>, ...nombres: string[]): string {
  const entradas = Object.entries(tabla);
  for (const nombre of nombres) {
    const hit = entradas.find(([k]) => k.toLowerCase() === nombre.toLowerCase());
    if (hit && hit[1]) return hit[1];
  }
  return '';
}

/** Ping + identidad: `magicBox.cgi?action=getSystemInfo`. Falla si no hay red/credenciales. */
export async function verificarConexion(credenciales: CredencialesEquipo): Promise<InfoEquipo> {
  const texto = await cgiGet(credenciales, '/cgi-bin/magicBox.cgi?action=getSystemInfo');
  const tabla = parsearTablaCGI(texto);
  const serial = campoCI(tabla, 'serial', 'serialNumber', 'deviceID');
  if (!serial) {
    throw new DeviceConnectionError('El equipo no devolvió su serial (¿modelo no soportado?)');
  }
  return {
    modelo: campoCI(tabla, 'deviceType') || 'desconocido',
    serial,
    version: campoCI(tabla, 'softwareVersion', 'firmwareVersion')
  };
}

/**
 * MAC del equipo por su propia configuración de red:
 * `configManager.cgi?action=getConfig&name=Network` (todas las tarjetas).
 *
 * Se usa como respaldo de la tabla ARP local, que es la que manda (funciona con
 * cualquier marca, no solo con Dahua). Lanza si el equipo no responde.
 */
export async function leerMacsDelEquipo(credenciales: CredencialesEquipo): Promise<string[]> {
  const texto = await cgiGet(
    credenciales,
    '/cgi-bin/configManager.cgi?action=getConfig&name=Network'
  );
  const macs = new Set<string>();
  for (const linea of texto.split(/\r?\n/)) {
    const idx = linea.indexOf('=');
    if (idx <= 0) continue;
    const clave = linea.slice(0, idx).trim().toLowerCase();
    if (!clave.endsWith('physicaladdress')) continue;
    const mac = normalizarMac(linea.slice(idx + 1));
    if (mac) macs.add(mac);
  }
  return [...macs];
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
  let respuesta: string;
  try {
    respuesta = await cgiPostJson(credenciales, '/cgi-bin/FaceInfoManager.cgi?action=add', body);
  } catch (error) {
    // El ASI3213A-W responde Bad Request a cualquier alta de cara por CGI.
    if (error instanceof DeviceConnectionError && /\b400\b|bad request/i.test(error.message)) {
      throw new DeviceConnectionError(
        'Este modelo no acepta cargar caras por red: cargá la cara en el equipo y usá "Capturar desde el lector".'
      );
    }
    throw error;
  }
  const r = jsonOTexto(respuesta);
  if (typeof r === 'string' && !r.includes('OK') && r !== '') {
    throw new DeviceConnectionError(`El equipo rechazó la cara: ${r.substring(0, 200)}`);
  }
}

export interface CaraLeida {
  fotoBase64: string;
}

/**
 * Los CGI de caras de los ASI responden JSON en PascalCase, no `clave=valor`:
 *   startFind → { "Token": 2, "Total": 0 }
 *   doFind    → lista de caras con UserID + Info.PhotoData
 * El token puede ser 0 y ser válido, así que nunca se usa como booleano.
 */
function campoDe(objeto: Record<string, unknown>, ...nombres: string[]): unknown {
  const entradas = Object.entries(objeto);
  for (const nombre of nombres) {
    const hit = entradas.find(([clave]) => clave.toLowerCase() === nombre.toLowerCase());
    if (hit && hit[1] !== undefined && hit[1] !== null) return hit[1];
  }
  return undefined;
}

function objetoJson(texto: string): Record<string, unknown> | null {
  const r = jsonOTexto(texto);
  if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
  return r as Record<string, unknown>;
}

/** Primera foto (PhotoData en base64) dentro de un subárbol del JSON del equipo. */
function primeraFoto(nodo: unknown): string | null {
  if (!nodo || typeof nodo !== 'object') return null;
  if (Array.isArray(nodo)) {
    for (const item of nodo) {
      const foto = primeraFoto(item);
      if (foto) return foto;
    }
    return null;
  }
  const obj = nodo as Record<string, unknown>;
  const fotos = campoDe(obj, 'PhotoData');
  if (Array.isArray(fotos)) {
    const foto = fotos.find(f => typeof f === 'string' && f);
    if (typeof foto === 'string') return foto;
  }
  for (const valor of Object.values(obj)) {
    const foto = primeraFoto(valor);
    if (foto) return foto;
  }
  return null;
}

/**
 * Busca en el JSON de doFind la cara del UserID pedido. En el firmware la foto
 * va anidada (`{ UserID, Info: { PhotoData: [...] } }`), pero se acepta también
 * PhotoData al mismo nivel por si otro modelo lo aplana.
 */
function buscarFotoDeUsuario(nodo: unknown, userId: string): string | null {
  if (!nodo || typeof nodo !== 'object') return null;
  if (Array.isArray(nodo)) {
    for (const item of nodo) {
      const foto = buscarFotoDeUsuario(item, userId);
      if (foto) return foto;
    }
    return null;
  }
  const obj = nodo as Record<string, unknown>;
  const user = campoDe(obj, 'UserID', 'UserId');
  if (user !== undefined && String(user) === userId) {
    const foto = primeraFoto(obj);
    if (foto) return foto;
  }
  for (const valor of Object.values(obj)) {
    const foto = buscarFotoDeUsuario(valor, userId);
    if (foto) return foto;
  }
  return null;
}

/** Cuántas caras tiene guardadas el equipo (startFind → Total). */
export async function contarCarasEnEquipo(credenciales: CredencialesEquipo): Promise<number> {
  const inicio = objetoJson(
    await cgiGet(credenciales, '/cgi-bin/FaceInfoManager.cgi?action=startFind')
  );
  if (!inicio) return 0;
  const token = campoDe(inicio, 'Token');
  if (token !== undefined) {
    // Liberar la búsqueda: si no, el equipo acumula tokens abiertos.
    await cgiGet(
      credenciales,
      `/cgi-bin/FaceInfoManager.cgi?action=stopFind&token=${encodeURIComponent(String(token))}`
    ).catch(() => undefined);
  }
  const total = Number(campoDe(inicio, 'Total') ?? 0);
  return Number.isFinite(total) ? total : 0;
}

/**
 * Lee la cara de vuelta: `startFind` → `doFind` con condición UserID.
 *
 * Ojo con el modelo ASI3213A-W: `action=add` (empujar una cara al equipo) NO
 * está implementado por CGI — responde Bad Request con cualquier payload —, así
 * que la cara solo puede ENTRAR por el equipo (su menú o su web) y nosotros la
 * leemos. Este es el camino soportado.
 */
export async function leerCara(
  credenciales: CredencialesEquipo,
  userId: string
): Promise<CaraLeida | null> {
  const inicio = objetoJson(
    await cgiGet(credenciales, '/cgi-bin/FaceInfoManager.cgi?action=startFind')
  );
  if (!inicio) {
    throw new DeviceConnectionError('El equipo no devolvió una búsqueda de caras válida');
  }
  const token = campoDe(inicio, 'Token');
  if (token === undefined) {
    throw new DeviceConnectionError('El equipo no devolvió token de búsqueda de caras');
  }
  const total = Number(campoDe(inicio, 'Total') ?? 0);

  try {
    // Sin ninguna cara guardada no hay nada que buscar (y no es un error).
    if (total === 0) return null;

    const condicion = encodeURIComponent(JSON.stringify({ UserID: userId }));
    const fin = await cgiGet(
      credenciales,
      `/cgi-bin/FaceInfoManager.cgi?action=doFind&token=${encodeURIComponent(
        String(token)
      )}&condition=${condicion}`
    );
    const foto = buscarFotoDeUsuario(jsonOTexto(fin), userId);
    return foto ? { fotoBase64: foto } : null;
  } finally {
    await cgiGet(
      credenciales,
      `/cgi-bin/FaceInfoManager.cgi?action=stopFind&token=${encodeURIComponent(String(token))}`
    ).catch(() => undefined);
  }
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
