import crypto from 'crypto';
import { descifrarSecreto } from '@/lib/biometric/credencialesCrypto';
import { normalizarMac } from '@/lib/biometric/discovery';
export interface CredencialesEquipo {
  ip: string;
  usuario: string;
  clave: string;
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

export class DeviceAuthError extends DeviceConnectionError {
  constructor(mensaje: string, causa?: unknown) {
    super(mensaje, causa);
    this.name = 'DeviceAuthError';
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
): Promise<Response> {
  const base = `http://${credenciales.ip}`;
  const url = new URL(path, base);
  const pathConQuery = `${url.pathname}${url.search}`;

  const headers: Record<string, string> = {
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

  let response: Response;
  try {
    response = await pedido();
  } catch (error) {
    throw new DeviceConnectionError(`No se pudo conectar al equipo en ${credenciales.ip}`, error);
  }

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
    throw new DeviceAuthError('Usuario o clave del equipo incorrectos');
  }
  if (!response.ok) {
    const texto = await response.text();
    throw new DeviceConnectionError(
      `El equipo respondió ${response.status}: ${texto.substring(0, 200)}`
    );
  }
  return response;
}

function esNoImplementada(error: unknown): boolean {
  const texto = (error instanceof Error ? error.message : '').toLowerCase();
  return (
    /respondi[oó] (400|501)/.test(texto) ||
    texto.includes('bad request') ||
    texto.includes('not implemented')
  );
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
    } catch {}
  }
  return texto;
}

export interface InfoEquipo {
  modelo: string;
  serial: string;
  version: string;
}

function campoCI(tabla: Record<string, string>, ...nombres: string[]): string {
  const entradas = Object.entries(tabla);
  for (const nombre of nombres) {
    const hit = entradas.find(([k]) => k.toLowerCase() === nombre.toLowerCase());
    if (hit && hit[1]) return hit[1];
  }
  return '';
}

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

export async function contarCarasEnEquipo(credenciales: CredencialesEquipo): Promise<number> {
  const inicio = objetoJson(
    await cgiGet(credenciales, '/cgi-bin/FaceInfoManager.cgi?action=startFind')
  );
  if (!inicio) return 0;
  const token = campoDe(inicio, 'Token');
  if (token !== undefined) {
    await cgiGet(
      credenciales,
      `/cgi-bin/FaceInfoManager.cgi?action=stopFind&token=${encodeURIComponent(String(token))}`
    ).catch(() => undefined);
  }
  const total = Number(campoDe(inicio, 'Total') ?? 0);
  return Number.isFinite(total) ? total : 0;
}

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
    if (total === 0) return null;

    const condicion = encodeURIComponent(JSON.stringify({ UserID: userId }));
    let fin: string;
    try {
      fin = await cgiGet(
        credenciales,
        `/cgi-bin/FaceInfoManager.cgi?action=doFind&token=${encodeURIComponent(
          String(token)
        )}&condition=${condicion}`
      );
    } catch (error) {
      if (esNoImplementada(error)) {
        throw new DeviceConnectionError(
          'Lectura de caras no implementada en este firmware: doFind respondió Bad Request'
        );
      }
      throw error;
    }
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

export async function eliminarUsuarioDelEquipo(
  credenciales: CredencialesEquipo,
  userId: string
): Promise<void> {
  await cgiGet(
    credenciales,
    `/cgi-bin/recordUpdater.cgi?action=remove&name=AccessControlCard&UserID=${encodeURIComponent(userId)}`
  ).catch(() => undefined);
  await cgiPostJson(credenciales, '/cgi-bin/FaceInfoManager.cgi?action=delete', {
    UserID: userId
  }).catch(() => undefined);
  await cgiPostJson(credenciales, '/cgi-bin/FingerPrintManager.cgi?action=delete', {
    UserID: userId
  }).catch(() => undefined);
}

export async function capturarHuellaEnEquipo(
  credenciales: CredencialesEquipo,
  userId: string
): Promise<HuellaLeida | null> {
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
  createTime: number;
  userId: string;
  tipo: string | null;
  status: number | null;
  metodo: number | null;
  url: string | null;
}

export async function leerRegistrosAcceso(
  credenciales: CredencialesEquipo,
  opciones: { count?: number; desde?: number } = {}
): Promise<RecordAcceso[]> {
  const count = Math.max(1, Math.trunc(opciones.count ?? 200));
  const desde = Math.max(0, Math.trunc(opciones.desde ?? 0));
  const base = '/cgi-bin/recordFinder.cgi?action=find&name=AccessControlCardRec';

  const pedir = async (offset: number, limite: number) =>
    cgiGet(credenciales, `${base}&count=${limite}&offset=${offset}`);

  const registros = parsearRecordsAcceso(await pedir(desde, count));
  if (registros.length > 0 || desde === 0) return registros;

  const cola = parsearRecordsAcceso(await pedir(desde - 1, 1));
  return cola.length > 0 ? [] : parsearRecordsAcceso(await pedir(0, count));
}

export function parsearRecordsAcceso(texto: string): RecordAcceso[] {
  const r = jsonOTexto(texto);
  let items: unknown[] = [];
  if (Array.isArray(r)) {
    items = r;
  } else if (r && typeof r === 'object') {
    const records = (r as Record<string, unknown>)['records'];
    if (Array.isArray(records)) items = records;
  } else if (typeof r === 'string') {
    items = filasDesdeTablaCgi(r);
  }

  const out: RecordAcceso[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const recNo = Number(rec['RecNo'] ?? rec['recNo'] ?? NaN);
    const createTime = Number(rec['CreateTime'] ?? rec['createTime'] ?? NaN);
    const userId = String(rec['UserID'] ?? rec['userId'] ?? '').trim();
    if (!Number.isFinite(recNo) || !Number.isFinite(createTime)) continue;
    const urlCruda = String(rec['URL'] ?? rec['url'] ?? '').trim();
    out.push({
      recNo,
      createTime,
      userId,
      tipo: rec['Type'] != null ? String(rec['Type']) : null,
      status: rec['Status'] != null ? Number(rec['Status']) : null,
      metodo: rec['Method'] != null ? Number(rec['Method']) : null,
      url: urlCruda.length > 0 ? urlCruda : null
    });
  }
  return out;
}

function filasDesdeTablaCgi(texto: string): Record<string, unknown>[] {
  const tabla = parsearTablaCGI(texto);
  const filas = new Map<string, Record<string, unknown>>();
  for (const [clave, valor] of Object.entries(tabla)) {
    const coincide = /^records\[(\d+)]\.([A-Za-z0-9_]+)$/.exec(clave);
    if (!coincide) continue;
    const fila = filas.get(coincide[1]) ?? {};
    fila[coincide[2]] = valor;
    filas.set(coincide[1], fila);
  }
  return [...filas.values()];
}
