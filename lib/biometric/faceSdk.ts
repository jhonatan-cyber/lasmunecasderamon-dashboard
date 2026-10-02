import { completarPerfilAsistencia } from './attendanceUserProfile';
import type { CredencialesEquipo } from '@/lib/biometric/deviceClient';
import { cargarSdkNet, type SdkNet } from './netSdk';

const PUERTO_NETSDK = 37777;
const GETFACEEIGEN = 5;
const TAMANO_IN_EIGEN = 16;
const TAMANO_OUT_EIGEN = 24;
const MAXIMO_BYTES_FOTO = 200_000;
const USER_SERVICE_INSERT = 0;
const USER_SERVICE_GET = 1;
const USER_SERVICE_REMOVE = 2;
const FACE_SERVICE_INSERT = 0;
const FACE_SERVICE_UPDATE = 2;
const FACE_SERVICE_REMOVE = 3;
const FALLO_NOERROR = 0;
const FALLO_INVALID_PARAM = 2;
const FALLO_INVALID_FACE = 5;
const FALLO_INVALID_USER = 7;
const FALLO_INSERT_LIMIT = 11;
const FALLO_MAX_INSERT_RATE = 12;
const FALLO_NO_RECORD = 16;
const FALLO_NOMORE_RECORD = 17;
const FALLO_RECORD_ALREADY_EXISTS = 18;
const FALLO_RECORD_ALREADY_EXISTS_ASI = 24;
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
export const ERROR_NO_SOPORTADO = 0x8000004f;
export const ERROR_PARAMETRO_ILEGAL = 0x80000007;
export const ERROR_SIN_CARA = 0x80000514;

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

export function vectorDesdeEigen(datos: Uint8Array): Float32Array {
  const vista = Buffer.from(datos.buffer, datos.byteOffset, datos.byteLength);
  const vector = new Float32Array(Math.floor(vista.length / 4));
  for (let i = 0; i < vector.length; i++) vector[i] = vista.readFloatLE(i * 4);
  return vector;
}

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

function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function cargarSdk(): Promise<SdkNet> {
  try {
    return await cargarSdkNet();
  } catch (error) {
    throw new ErrorFacial('sdk_no_disponible', mensajeDeError(error));
  }
}

export function escribirTextoUtf8(
  buffer: Buffer,
  offset: number,
  maxBytes: number,
  texto: string
): void {
  let usados = 0;
  for (const caracter of texto) {
    const bytes = Buffer.byteLength(caracter, 'utf8');
    if (usados + bytes >= maxBytes) break;
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

function bufferPersona(codigo: string, nombre: string): Buffer {
  const buffer = Buffer.alloc(TAMANO_USER_INFO);
  escribirTextoUtf8(buffer, 0, NET_MAX_USERID_LEN, codigo);
  escribirTextoUtf8(buffer, NET_MAX_USERID_LEN, NET_MAX_USER_NAME_LEN, nombre);
  completarPerfilAsistencia(buffer);
  return buffer;
}

function bufferCara(codigo: string, eigen: Buffer): Buffer {
  const buffer = Buffer.alloc(TAMANO_FACE_INFO);
  escribirTextoUtf8(buffer, 0, NET_MAX_USERID_LEN, codigo);
  buffer.writeInt32LE(1, FACE_N_FACEDATA);
  buffer.writeInt32LE(eigen.length, FACE_N_FACEDATA_LEN);
  eigen.copy(buffer, FACE_FACEDATA);
  return buffer;
}

function bufferListaUsuario(codigo: string): Buffer {
  const buffer = Buffer.alloc(TAMANO_LISTA_IN);
  buffer.writeUInt32LE(TAMANO_LISTA_IN, 0);
  buffer.writeInt32LE(1, 4);
  escribirTextoUtf8(buffer, 8, NET_MAX_USERID_LEN, codigo);
  return buffer;
}

function bufferPunteroUnico(direccion: bigint): Buffer {
  const buffer = Buffer.alloc(TAMANO_SALIDA_INSERT);
  buffer.writeUInt32LE(TAMANO_SALIDA_INSERT, 0);
  buffer.writeInt32LE(1, 4);
  buffer.writeBigUInt64LE(direccion, 8);
  return buffer;
}

type AccionConSesion<T> = (sesion: unknown, sdk: SdkNet) => T | Promise<T>;

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
      const inParam = Buffer.alloc(TAMANO_IN_EIGEN);
      inParam.writeUInt32LE(TAMANO_IN_EIGEN, 0);
      inParam.writeUInt32LE(foto.length, 4);
      inParam.writeBigUInt64LE(BigInt(sdk.direccion(foto)), 8);
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

export async function personaEnEquipo(
  credenciales: CredencialesEquipo,
  codigo: string
): Promise<boolean> {
  return conSesionFacial(credenciales, (sesion, sdk) => {
    return consultaPersona(sesion, sdk, codigo) === 'existe';
  });
}

function consultaPersona(
  sesion: unknown,
  sdk: SdkNet,
  codigo: string,
  destino?: Buffer
): 'existe' | 'no_existe' {
  const operar = sdk.lib.func(
    'bool CLIENT_OperateAccessUserService(int64 lLoginID, int emType, void *pInParam, void *pOutParam, int nWaitTime)'
  );

  const infoGet = destino ?? Buffer.alloc(TAMANO_USER_INFO);
  const falloGet = Buffer.alloc(4);
  const outGet = Buffer.alloc(TAMANO_SALIDA_GET);
  outGet.writeUInt32LE(TAMANO_SALIDA_GET, 0);
  outGet.writeInt32LE(1, 4);
  outGet.writeBigUInt64LE(BigInt(sdk.direccion(infoGet)), 8);
  outGet.writeBigUInt64LE(BigInt(sdk.direccion(falloGet)), 16);
  const ok = operar(
    sesion,
    USER_SERVICE_GET,
    bufferListaUsuario(codigo),
    outGet,
    ESPERA_MS_REGISTRO
  );
  if (!ok) {
    throw new ErrorFacial('error_desconocido', 'No se pudo consultar la persona en el lector.');
  }

  const falloConsulta = falloGet.readInt32LE(0);
  if (falloConsulta === FALLO_NOERROR) return 'existe';
  if (esSinRegistro(falloConsulta)) return 'no_existe';
  throw errorDeRegistro(falloConsulta, 'consultar a la persona');
}

export async function guardarPersonaEnEquipo(
  credenciales: CredencialesEquipo,
  persona: { codigo: string; nombre: string }
): Promise<'creada' | 'ya_existia'> {
  return conSesionFacial(credenciales, (sesion, sdk) => {
    const operar = sdk.lib.func(
      'bool CLIENT_OperateAccessUserService(int64 lLoginID, int emType, void *pInParam, void *pOutParam, int nWaitTime)'
    );

    const existente = Buffer.alloc(TAMANO_USER_INFO);
    const consulta = consultaPersona(sesion, sdk, persona.codigo, existente);
    if (consulta === 'existe' && !completarPerfilAsistencia(existente)) return 'ya_existia';

    const info = consulta === 'existe' ? existente : bufferPersona(persona.codigo, persona.nombre);
    const falloInsert = Buffer.alloc(4);
    const ok = operar(
      sesion,
      USER_SERVICE_INSERT,
      bufferPunteroUnico(BigInt(sdk.direccion(info))),
      bufferPunteroUnico(BigInt(sdk.direccion(falloInsert))),
      ESPERA_MS_REGISTRO
    );

    if (!ok)
      throw new ErrorFacial('error_desconocido', 'No se pudo guardar la persona en el lector.');
    const falloCarga = falloInsert.readInt32LE(0);
    if (falloCarga === FALLO_NOERROR) return consulta === 'existe' ? 'ya_existia' : 'creada';
    if (esYaExiste(falloCarga)) return 'ya_existia';
    throw errorDeRegistro(falloCarga, 'crear a la persona');
  });
}

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
