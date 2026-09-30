/**
 * Puente NetSDK (Dahua `dhnetsdk.dll`) para el motor facial del lector.
 *
 * El equipo NO expone comparación de caras ni por CGI (`FaceInfoManager.cgi`
 * `compare/verify` → Not Implemented) ni por `CLIENT_MatchTwoFaceImage` (esa
 * API es de face recognition servers / IVSS: el ASI3213A responde "no
 * soportado"). Lo que SÍ expone es `CLIENT_FaceInfoOpreate` con la operación
 * `EM_FACEINFO_OPREATE_GETFACEEIGEN`: el propio motor del equipo extrae el
 * vector facial (256 floats normalizados) de una foto JPEG. Con los vectores de
 * la foto guardada y de la captura en vivo se calcula la similitud coseno y se
 * decide si la persona frente al lector es la misma.
 *
 * Además, el mismo SDK permite ESCRIBIR en el equipo sin pasar por su menú
 * (los CGI de alta del ASI3213A-W responden Bad Request):
 * `CLIENT_OperateAccessUserService` crea/consulta/borra la PERSONA y
 * `CLIENT_OperateAccessFaceService` inserta/actualiza/borra su CARA. La cara se
 * carga como VECTOR (1024 bytes), no como foto: el vector lo produce
 * `extraerVectorFacial`, o sea el propio motor del equipo. Verificado contra el
 * ASI3213A-W real: persona GET/INSERT/REMOVE y cara INSERT/UPDATE/REMOVE/re-INSERT.
 *
 * Requisitos: Windows con `dhnetsdk.dll` (viene con SmartPSS Lite) y el puente
 * FFI `koffi`. La carpeta se configura con `DAHUA_SDK_DIR` (default:
 * `C:\Program Files\SmartPSSLite`). El umbral de decisión es
 * `BIOMETRIC_FACE_MATCH_THRESHOLD` (default 0.7; medido en el ASI3213A-W:
 * personas distintas ≈ -0.15..0.17, misma persona ≈ 0.9).
 */
import fs from 'fs';
import path from 'path';
import type { CredencialesEquipo } from '@/lib/biometric/deviceClient';

/** Puerto del protocolo NetSDK (el HTTP/CGI del equipo va por el 80). */
const PUERTO_NETSDK = 37777;
/** `EM_FACEINFO_OPREATE_GETFACEEIGEN` de `CLIENT_FaceInfoOpreate`. */
const GETFACEEIGEN = 5;
/** Tamaño de `NET_IN_GETFACEEIGEN_INFO` / `NET_OUT_GETFACEEIGEN_INFO` en x64. */
const TAMANO_IN_EIGEN = 16;
const TAMANO_OUT_EIGEN = 24;
/** El equipo acepta fotos de hasta ~200 KB para extraer el vector. */
const MAXIMO_BYTES_FOTO = 200_000;

/** Operaciones de `CLIENT_OperateAccessUserService`. */
const USER_SERVICE_INSERT = 0;
const USER_SERVICE_GET = 1;
const USER_SERVICE_REMOVE = 2;
/** Operaciones de `CLIENT_OperateAccessFaceService`. */
const FACE_SERVICE_INSERT = 0;
const FACE_SERVICE_UPDATE = 2;
const FACE_SERVICE_REMOVE = 3;

/** Códigos de `NET_EM_FAILCODE` que devuelven las operaciones de registros. */
const FALLO_NOERROR = 0;
const FALLO_INVALID_PARAM = 2;
const FALLO_INVALID_FACE = 5;
const FALLO_INVALID_USER = 7;
const FALLO_INSERT_LIMIT = 11;
const FALLO_MAX_INSERT_RATE = 12;
const FALLO_NO_RECORD = 16;
const FALLO_NOMORE_RECORD = 17;
const FALLO_RECORD_ALREADY_EXISTS = 18;
/**
 * El ASI3213A-W devuelve 24 al repetir el INSERT de una cara que ya existe
 * (fuera del enum documentado, donde el duplicado es 18). Se tratan igual.
 */
const FALLO_RECORD_ALREADY_EXISTS_ASI = 24;

/**
 * Layouts x64 de los structs de alta, extraídos del mapa de referencia y
 * verificados contra el equipo real.
 *   NET_ACCESS_FACE_INFO (43288): szUserID[32]@0, nFaceData@32, FACEDATA[20]@36,
 *     nFaceDataLen[20]@40996, nFacePhoto@41076, fotos…@41080..41120, pFacePhotos@41120.
 *   NET_ACCESS_USER_INFO: szUserID[32]@0, szName[32]@32 (resto de campos, no usados).
 *   NET_IN_ACCESS_{USER,FACE}_SERVICE_INSERT (16): dwSize@0, nNum@4, pInfo@8.
 *   NET_IN_ACCESS_{USER,FACE}_SERVICE_GET/REMOVE (3208): dwSize@0, nUserNum@4, USERID[100]@8.
 *   NET_OUT_..._INSERT/REMOVE (16): dwSize@0, nMaxRetNum@4, pFailCode@8.
 *   NET_OUT_..._GET (24): dwSize@0, nMaxRetNum@4, pInfo@8, pFailCode@16.
 */
const TAMANO_FACE_INFO = 43288;
const FACE_N_FACEDATA = 32;
const FACE_FACEDATA = 36;
const FACE_N_FACEDATA_LEN = 40996;
const TAMANO_USER_INFO = 65536;
const TAMANO_LISTA_IN = 3208;
const TAMANO_SALIDA_INSERT = 16;
const TAMANO_SALIDA_GET = 24;
const ESPERA_MS_REGISTRO = 15_000;
const NET_MAX_USERID_LEN = 32;
const NET_MAX_USER_NAME_LEN = 32;
export const UMBRAL_COINCIDENCIA_DEFECTO = 0.7;

/** Códigos de error del NetSDK usados por la extracción de vectores. */
export const ERROR_NO_SOPORTADO = 0x8000004f; // _EC(79): el equipo no soporta la operación
export const ERROR_PARAMETRO_ILEGAL = 0x80000007; // _EC(7): foto inválida o demasiado grande
export const ERROR_SIN_CARA = 0x80000514; // no hay cara detectable en la imagen

export type MotivoFalloFacial =
  | 'sdk_no_disponible'
  | 'login_fallido'
  | 'sin_cara'
  | 'foto_invalida'
  | 'no_soportado'
  | 'sin_registro'
  | 'equipo_lleno'
  | 'error_desconocido';

export class ErrorFacial extends Error {
  readonly motivo: MotivoFalloFacial;

  constructor(motivo: MotivoFalloFacial, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorFacial';
    this.motivo = motivo;
  }
}

/** Convierte los 1024 bytes little-endian del equipo en 256 floats. */
export function vectorDesdeEigen(datos: Uint8Array): Float32Array {
  const vista = Buffer.from(datos.buffer, datos.byteOffset, datos.byteLength);
  const vector = new Float32Array(Math.floor(vista.length / 4));
  for (let i = 0; i < vector.length; i++) vector[i] = vista.readFloatLE(i * 4);
  return vector;
}

/** Similitud coseno de dos vectores; 0 si no se pueden comparar. */
export function similitudCoseno(a: Float32Array, b: Float32Array): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let punto = 0;
  let normaA = 0;
  let normaB = 0;
  for (let i = 0; i < a.length; i++) {
    punto += a[i] * b[i];
    normaA += a[i] * a[i];
    normaB += b[i] * b[i];
  }
  if (normaA === 0 || normaB === 0) return 0;
  return punto / (Math.sqrt(normaA) * Math.sqrt(normaB));
}

/** Umbral de decisión (0..1) configurable por entorno. */
export function umbralCoincidenciaFacial(
  entorno: Record<string, string | undefined> = process.env
): number {
  const valor = Number(entorno.BIOMETRIC_FACE_MATCH_THRESHOLD);
  if (!Number.isFinite(valor) || valor <= 0 || valor > 1) return UMBRAL_COINCIDENCIA_DEFECTO;
  return valor;
}

export function decidirCoincidencia(
  similitud: number,
  umbral: number = UMBRAL_COINCIDENCIA_DEFECTO
): boolean {
  return similitud >= umbral;
}

/** Traduce un código de error del NetSDK a motivo + mensaje para la UI. */
export function mensajeDeCodigoFacial(codigo: number): {
  motivo: MotivoFalloFacial;
  mensaje: string;
} {
  switch (codigo >>> 0) {
    case ERROR_SIN_CARA:
      return { motivo: 'sin_cara', mensaje: 'El equipo no detectó ninguna cara en la foto.' };
    case ERROR_PARAMETRO_ILEGAL:
      return {
        motivo: 'foto_invalida',
        mensaje: 'El equipo rechazó la foto (¿supera los ~200 KB o no es un JPEG?).'
      };
    case ERROR_NO_SOPORTADO:
      return {
        motivo: 'no_soportado',
        mensaje: 'El equipo no soporta la extracción de vectores faciales.'
      };
    default:
      return {
        motivo: 'error_desconocido',
        mensaje: `El equipo devolvió el error 0x${(codigo >>> 0).toString(16)}.`
      };
  }
}

interface KoffiFuncion {
  (...args: unknown[]): unknown;
}

interface KoffiBiblioteca {
  func(prototipo: string): KoffiFuncion;
}

interface KoffiModulo {
  load(ruta: string): KoffiBiblioteca;
  proto(nombre: string, retorno: string, parametros: string[]): unknown;
  pointer(tipo: unknown): unknown;
  register(fn: (...args: unknown[]) => void, tipo: unknown): unknown;
  address(buffer: Buffer): number;
}

interface SdkFacial {
  lib: KoffiBiblioteca;
  direccion: (buffer: Buffer) => number;
  /** Mantiene vivo el callback de CLIENT_Init (si se recolecta, el SDK crashea). */
  callback: unknown;
}

/**
 * El cache del SDK vive en `globalThis`, no en el módulo: en dev, el HMR de
 * Turbopack re-evalúa este archivo y un cache local volvería a ejecutar
 * `koffi.proto`/`CLIENT_Init` con el SDK ya cargado, dejando el puente facial
 * inservible hasta reiniciar el servidor (lo vimos en vivo: altas que de repente
 * fallan con `sdk_no_disponible` tras editar un archivo).
 */
const cacheSdk = globalThis as typeof globalThis & { __dahuaSdkFacial?: SdkFacial | null };

function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Carga e inicializa el NetSDK una sola vez por proceso. */
async function cargarSdk(): Promise<SdkFacial> {
  if (cacheSdk.__dahuaSdkFacial) return cacheSdk.__dahuaSdkFacial;

  const carpetaSdk = (process.env.DAHUA_SDK_DIR || 'C:\\Program Files\\SmartPSSLite').trim();
  const rutaDll = path.join(carpetaSdk, 'dhnetsdk.dll');
  if (!fs.existsSync(rutaDll)) {
    throw new ErrorFacial(
      'sdk_no_disponible',
      `No se encontró dhnetsdk.dll en "${carpetaSdk}". Instalá SmartPSS Lite o configurá DAHUA_SDK_DIR con la carpeta que tenga el SDK.`
    );
  }

  let koffi: KoffiModulo;
  try {
    const modulo = (await import('koffi')) as unknown as { default?: KoffiModulo } & KoffiModulo;
    koffi = (modulo.default ?? modulo) as KoffiModulo;
  } catch (error) {
    throw new ErrorFacial(
      'sdk_no_disponible',
      `El puente FFI koffi no está disponible en el servidor (${mensajeDeError(error)}).`
    );
  }

  // dhnetsdk.dll depende de otras DLLs de la misma carpeta (Infra, Common…):
  // agregarla al PATH hace que Windows las resuelva al cargarla.
  process.env.PATH = `${process.env.PATH || ''};${carpetaSdk}`;

  let lib: KoffiBiblioteca;
  try {
    lib = koffi.load(rutaDll);
  } catch (error) {
    throw new ErrorFacial(
      'sdk_no_disponible',
      `No se pudo cargar dhnetsdk.dll: ${mensajeDeError(error)}`
    );
  }

  try {
    const proto = koffi.proto('DisconnectCbFacial', 'void', [
      'int64_t',
      'const char *',
      'uint16_t',
      'uint64_t'
    ]);
    const callback = koffi.register(() => {}, koffi.pointer(proto));
    const init = lib.func('bool CLIENT_Init(void *cbDisconnect, uint64_t dwUser)');
    if (!init(callback, 0)) throw new Error('CLIENT_Init devolvió false');
    cacheSdk.__dahuaSdkFacial = {
      lib,
      direccion: (buffer: Buffer) => koffi.address(buffer),
      callback
    };
  } catch (error) {
    throw new ErrorFacial('sdk_no_disponible', `CLIENT_Init falló: ${mensajeDeError(error)}`);
  }

  return cacheSdk.__dahuaSdkFacial;
}

/** Copia texto a un buffer UTF-8 sin partir a la mitad un carácter multibyte. */
export function escribirTextoUtf8(
  buffer: Buffer,
  offset: number,
  maxBytes: number,
  texto: string
): void {
  let usados = 0;
  for (const caracter of texto) {
    const bytes = Buffer.byteLength(caracter, 'utf8');
    if (usados + bytes >= maxBytes) break; // deja lugar para el \0 final
    buffer.write(caracter, offset + usados, 'utf8');
    usados += bytes;
  }
}

function esSinRegistro(codigo: number): boolean {
  return codigo === FALLO_NO_RECORD || codigo === FALLO_NOMORE_RECORD;
}

function esYaExiste(codigo: number): boolean {
  return codigo === FALLO_RECORD_ALREADY_EXISTS || codigo === FALLO_RECORD_ALREADY_EXISTS_ASI;
}

/** Traduce un `FAIL_CODE` de las operaciones de registros a un `ErrorFacial`. */
function errorDeRegistro(codigo: number, accion: string): ErrorFacial {
  switch (codigo) {
    case FALLO_INVALID_PARAM:
      return new ErrorFacial(
        'error_desconocido',
        `El equipo rechazó los datos al ${accion} (parámetros inválidos).`
      );
    case FALLO_INVALID_FACE:
      return new ErrorFacial('foto_invalida', `El equipo rechazó el vector facial al ${accion}.`);
    case FALLO_INVALID_USER:
      return new ErrorFacial(
        'error_desconocido',
        `El equipo rechazó a la persona al ${accion} (usuario inválido).`
      );
    case FALLO_INSERT_LIMIT:
      return new ErrorFacial(
        'equipo_lleno',
        'El equipo alcanzó su límite de personas o caras guardadas.'
      );
    case FALLO_MAX_INSERT_RATE:
      return new ErrorFacial(
        'error_desconocido',
        'El equipo está rechazando altas por velocidad: esperá unos segundos y volvé a intentar.'
      );
    default:
      return new ErrorFacial(
        'error_desconocido',
        `El equipo devolvió el error 0x${(codigo >>> 0).toString(16)} al ${accion}.`
      );
  }
}

/** NET_ACCESS_USER_INFO con szUserID@0 y szName@32. */
function bufferPersona(codigo: string, nombre: string): Buffer {
  const buffer = Buffer.alloc(TAMANO_USER_INFO);
  escribirTextoUtf8(buffer, 0, NET_MAX_USERID_LEN, codigo);
  escribirTextoUtf8(buffer, NET_MAX_USERID_LEN, NET_MAX_USER_NAME_LEN, nombre);
  return buffer;
}

/** NET_ACCESS_FACE_INFO con el vector (szFaceDatas[0]) ya cargado. */
function bufferCara(codigo: string, eigen: Buffer): Buffer {
  const buffer = Buffer.alloc(TAMANO_FACE_INFO);
  escribirTextoUtf8(buffer, 0, NET_MAX_USERID_LEN, codigo);
  buffer.writeInt32LE(1, FACE_N_FACEDATA);
  buffer.writeInt32LE(eigen.length, FACE_N_FACEDATA_LEN);
  eigen.copy(buffer, FACE_FACEDATA);
  return buffer;
}

/** NET_IN_ACCESS_{USER,FACE}_SERVICE_GET/REMOVE con el código en USERID[0]. */
function bufferListaUsuario(codigo: string): Buffer {
  const buffer = Buffer.alloc(TAMANO_LISTA_IN);
  buffer.writeUInt32LE(TAMANO_LISTA_IN, 0);
  buffer.writeInt32LE(1, 4);
  escribirTextoUtf8(buffer, 8, NET_MAX_USERID_LEN, codigo);
  return buffer;
}

/**
 * Struct de 16 bytes con un solo puntero: lo comparten
 * NET_IN_ACCESS_{USER,FACE}_SERVICE_INSERT (pInfo@8) y
 * NET_OUT_..._INSERT/REMOVE (pFailCode@8).
 */
function bufferPunteroUnico(direccion: bigint): Buffer {
  const buffer = Buffer.alloc(TAMANO_SALIDA_INSERT);
  buffer.writeUInt32LE(TAMANO_SALIDA_INSERT, 0);
  buffer.writeInt32LE(1, 4);
  buffer.writeBigUInt64LE(direccion, 8);
  return buffer;
}

type AccionConSesion<T> = (sesion: unknown, sdk: SdkFacial) => T | Promise<T>;

/**
 * Abre UNA sesión NetSDK y ejecuta la acción, con logout garantizado. Las
 * altas encadenan varias llamadas seguidas: acá se comparte el login y se
 * lanza `ErrorFacial('login_fallido')` si el equipo lo rechaza.
 */
async function conSesionFacial<T>(
  credenciales: CredencialesEquipo,
  accion: AccionConSesion<T>
): Promise<T> {
  const sdk = await cargarSdk();
  const login = sdk.lib.func(
    'int64 CLIENT_LoginEx2(const char *ip, uint16_t puerto, const char *usuario, const char *clave, int emSpecCap, void *capParam, void *deviceInfo, void *nError)'
  );
  const logout = sdk.lib.func('void CLIENT_Logout(int64 lLoginID)');

  const infoEquipo = Buffer.alloc(8192);
  const errorLogin = Buffer.alloc(4);
  const sesion = login(
    credenciales.ip,
    PUERTO_NETSDK,
    credenciales.usuario,
    credenciales.clave,
    0,
    null,
    infoEquipo,
    errorLogin
  );
  if (!sesion) {
    throw new ErrorFacial(
      'login_fallido',
      `El equipo rechazó la conexión NetSDK (${credenciales.ip}:${PUERTO_NETSDK}, código ${errorLogin.readInt32LE(0)}). ¿Está encendido y con la misma clave del CGI?`
    );
  }

  try {
    return await accion(sesion, sdk);
  } finally {
    logout(sesion);
  }
}

/**
 * Pide al equipo el vector facial de una foto. Lanza `ErrorFacial` con el
 * motivo cuando no se puede (sin cara, foto inválida, SDK ausente, etc.).
 *
 * Ante un error INDETERMINADO (p. ej. 0x80000002 en el ASI cuando el equipo
 * está ocupado — vimos fallar la primera extracción con el recolector de
 * asistencia corriendo) se reintenta una vez a los 500 ms. Los fallos
 * deterministas (sin cara, foto inválida, no soportado) no se repiten.
 */
export async function extraerVectorFacial(
  credenciales: CredencialesEquipo,
  foto: Buffer
): Promise<Float32Array> {
  if (!foto || foto.length === 0) {
    throw new ErrorFacial('foto_invalida', 'La foto llegó vacía.');
  }
  if (foto.length > MAXIMO_BYTES_FOTO) {
    throw new ErrorFacial(
      'foto_invalida',
      `La foto pesa ${Math.round(foto.length / 1024)} KB y el equipo acepta hasta ~${MAXIMO_BYTES_FOTO / 1000} KB.`
    );
  }

  const intentar = () =>
    conSesionFacial(credenciales, (sesion, sdk) => {
      const ultimoError = sdk.lib.func('uint32 CLIENT_GetLastError()');
      const faceInfo = sdk.lib.func(
        'bool CLIENT_FaceInfoOpreate(int64 lLoginID, int emType, void *pInParam, void *pOutParam, int nWaitTime)'
      );

      const vector = Buffer.alloc(8192);

      // NET_IN_GETFACEEIGEN_INFO (x64): dwSize@0, nPhotoDataLen@4, pszPhotoData@8
      const inParam = Buffer.alloc(TAMANO_IN_EIGEN);
      inParam.writeUInt32LE(TAMANO_IN_EIGEN, 0);
      inParam.writeUInt32LE(foto.length, 4);
      inParam.writeBigUInt64LE(BigInt(sdk.direccion(foto)), 8);

      // NET_OUT_GETFACEEIGEN_INFO (x64): dwSize@0, nIn@4, nOut@8, pszFaceEigen@16
      const outParam = Buffer.alloc(TAMANO_OUT_EIGEN);
      outParam.writeUInt32LE(TAMANO_OUT_EIGEN, 0);
      outParam.writeUInt32LE(vector.length, 4);
      outParam.writeUInt32LE(0, 8);
      outParam.writeBigUInt64LE(BigInt(sdk.direccion(vector)), 16);

      const ok = faceInfo(sesion, GETFACEEIGEN, inParam, outParam, 5000);
      if (!ok) {
        const { motivo, mensaje } = mensajeDeCodigoFacial(Number(ultimoError()));
        throw new ErrorFacial(motivo, mensaje);
      }

      const largoTal = outParam.readUInt32LE(8);
      if (largoTal <= 0) {
        throw new ErrorFacial('error_desconocido', 'El equipo no devolvió el vector facial.');
      }
      return vectorDesdeEigen(vector.subarray(0, largoTal));
    });

  try {
    return await intentar();
  } catch (error) {
    if (!(error instanceof ErrorFacial) || error.motivo !== 'error_desconocido') throw error;
    await new Promise(resuelve => setTimeout(resuelve, 500));
    return await intentar();
  }
}

/**
 * Crea la PERSONA en el equipo si todavía no existe (`USER_SERVICE_INSERT`).
 *
 * Primero consulta con `USER_SERVICE_GET`: el ASI responde `fail=16` (NO_RECORD)
 * cuando no está. Si el INSERT choca con un duplicado (18, o 24 que es el que
 * devuelve este firmware) se considera que ya estaba: el alta es idempotente.
 */
export async function guardarPersonaEnEquipo(
  credenciales: CredencialesEquipo,
  persona: { codigo: string; nombre: string }
): Promise<'creada' | 'ya_existia'> {
  return conSesionFacial(credenciales, (sesion, sdk) => {
    const operar = sdk.lib.func(
      'bool CLIENT_OperateAccessUserService(int64 lLoginID, int emType, void *pInParam, void *pOutParam, int nWaitTime)'
    );

    // ¿Ya está? GET con la info en un buffer holgado y el FAIL_CODE aparte.
    const infoGet = Buffer.alloc(TAMANO_USER_INFO);
    const falloGet = Buffer.alloc(4);
    const outGet = Buffer.alloc(TAMANO_SALIDA_GET);
    outGet.writeUInt32LE(TAMANO_SALIDA_GET, 0);
    outGet.writeInt32LE(1, 4);
    outGet.writeBigUInt64LE(BigInt(sdk.direccion(infoGet)), 8);
    outGet.writeBigUInt64LE(BigInt(sdk.direccion(falloGet)), 16);
    operar(
      sesion,
      USER_SERVICE_GET,
      bufferListaUsuario(persona.codigo),
      outGet,
      ESPERA_MS_REGISTRO
    );

    const falloConsulta = falloGet.readInt32LE(0);
    if (falloConsulta === FALLO_NOERROR) return 'ya_existia';
    if (!esSinRegistro(falloConsulta)) {
      throw errorDeRegistro(falloConsulta, 'consultar a la persona');
    }

    // INSERT de la persona (szUserID + szName): acá nace el código del lector.
    const info = bufferPersona(persona.codigo, persona.nombre);
    const falloInsert = Buffer.alloc(4);
    operar(
      sesion,
      USER_SERVICE_INSERT,
      bufferPunteroUnico(BigInt(sdk.direccion(info))),
      bufferPunteroUnico(BigInt(sdk.direccion(falloInsert))),
      ESPERA_MS_REGISTRO
    );

    const falloCarga = falloInsert.readInt32LE(0);
    if (falloCarga === FALLO_NOERROR) return 'creada';
    if (esYaExiste(falloCarga)) return 'ya_existia'; // la creó otro operador en el medio
    throw errorDeRegistro(falloCarga, 'crear a la persona');
  });
}

/**
 * Carga la cara en el equipo desde el VECTOR facial (los 1024 bytes que
 * devuelve `extraerVectorFacial`). Si la persona ya tiene cara, la actualiza
 * (`FACE_SERVICE_UPDATE`); si no, la inserta (`FACE_SERVICE_INSERT`). La foto
 * sola NO sirve: el ASI rechaza el INSERT sin `szFaceDatas` (verificado).
 */
export async function guardarCaraEnEquipo(
  credenciales: CredencialesEquipo,
  codigo: string,
  vector: Float32Array
): Promise<'cargada' | 'actualizada'> {
  if (!vector || vector.length === 0) {
    throw new ErrorFacial('foto_invalida', 'El vector facial llegó vacío.');
  }
  const eigen = Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);

  return conSesionFacial(credenciales, (sesion, sdk) => {
    const operar = sdk.lib.func(
      'bool CLIENT_OperateAccessFaceService(int64 lLoginID, int emType, void *pInParam, void *pOutParam, int nWaitTime)'
    );

    const enviar = (emType: number): number => {
      const info = bufferCara(codigo, eigen);
      const fallo = Buffer.alloc(4);
      operar(
        sesion,
        emType,
        bufferPunteroUnico(BigInt(sdk.direccion(info))),
        bufferPunteroUnico(BigInt(sdk.direccion(fallo))),
        ESPERA_MS_REGISTRO
      );
      return fallo.readInt32LE(0);
    };

    const falloInsert = enviar(FACE_SERVICE_INSERT);
    if (falloInsert === FALLO_NOERROR) return 'cargada';
    if (esYaExiste(falloInsert)) {
      const falloUpdate = enviar(FACE_SERVICE_UPDATE);
      if (falloUpdate === FALLO_NOERROR) return 'actualizada';
      throw errorDeRegistro(falloUpdate, 'actualizar la cara');
    }
    throw errorDeRegistro(falloInsert, 'cargar la cara');
  });
}

/**
 * Borra la PERSONA del equipo (`USER_SERVICE_REMOVE`). Devuelve `true` si el
 * equipo confirma que ya no está y `false` solo si responde NO_RECORD (el ASI
 * devuelve OK aunque el registro ya no exista: el borrado es idempotente). Se
 * lleva también su cara y sus credenciales.
 */
export async function eliminarPersonaEnEquipo(
  credenciales: CredencialesEquipo,
  codigo: string
): Promise<boolean> {
  return conSesionFacial(credenciales, (sesion, sdk) => {
    const operar = sdk.lib.func(
      'bool CLIENT_OperateAccessUserService(int64 lLoginID, int emType, void *pInParam, void *pOutParam, int nWaitTime)'
    );
    const fallo = Buffer.alloc(4);
    operar(
      sesion,
      USER_SERVICE_REMOVE,
      bufferListaUsuario(codigo),
      bufferPunteroUnico(BigInt(sdk.direccion(fallo))),
      ESPERA_MS_REGISTRO
    );
    const codigoFallo = fallo.readInt32LE(0);
    if (codigoFallo === FALLO_NOERROR) return true;
    if (esSinRegistro(codigoFallo)) return false;
    throw errorDeRegistro(codigoFallo, 'quitar a la persona');
  });
}

/** Borra SOLO la cara de la persona (deja la persona). Idempotente, igual que la anterior. */
export async function eliminarCaraEnEquipo(
  credenciales: CredencialesEquipo,
  codigo: string
): Promise<boolean> {
  return conSesionFacial(credenciales, (sesion, sdk) => {
    const operar = sdk.lib.func(
      'bool CLIENT_OperateAccessFaceService(int64 lLoginID, int emType, void *pInParam, void *pOutParam, int nWaitTime)'
    );
    const fallo = Buffer.alloc(4);
    operar(
      sesion,
      FACE_SERVICE_REMOVE,
      bufferListaUsuario(codigo),
      bufferPunteroUnico(BigInt(sdk.direccion(fallo))),
      ESPERA_MS_REGISTRO
    );
    const codigoFallo = fallo.readInt32LE(0);
    if (codigoFallo === FALLO_NOERROR) return true;
    if (esSinRegistro(codigoFallo)) return false;
    throw errorDeRegistro(codigoFallo, 'quitar la cara');
  });
}
