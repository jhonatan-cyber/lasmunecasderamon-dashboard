// @vitest-environment node
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests del puente facial sin el hardware: la parte pura (vectores, similitud,
 * umbrales, códigos) y toda la capa de sesión/altas/bajas del NetSDK contra un
 * `koffi` simulado.
 *
 * El doble de FFI registra cada buffer por dirección (como hace el SDK real)
 * y responde las llamadas del protocolo con los códigos que cada test
 * configura, de modo que se cubren login, logout, GET/INSERT/REMOVE de
 * personas y caras, la extracción de vectores y sus reintentos — sin la DLL
 * ni un equipo en la red. (La validación contra el ASI3213A-W real corre con
 * `FACIAL_REAL=1` aparte.)
 */

const sdk = vi.hoisted(() => {
  type Paso = { ok: boolean; codigo?: number; nOut?: number };

  /** Buffers entregados al "SDK", indexados por dirección (como hace koffi). */
  const direcciones = new Map<number, Buffer>();
  let proximaDireccion = 0x10000000;

  /** Configuración de comportamiento que cada test ajusta. */
  const fallos = {
    koffiLoadFalla: false,
    koffiLoadLanzaRaro: false,
    initOk: true,
    importFalla: false,
    loginOk: true
  };

  /** Registro de llamadas para las aserciones. */
  const registros = {
    loads: 0,
    rutaLoad: '' as string,
    logins: 0,
    sesion: 777,
    logout: [] as number[],
    userService: [] as number[],
    perfilIncompleto: false,
    usuarioInsertado: null as Buffer | null,
    faceService: [] as number[],
    faceInfo: [] as number[],
    fallosUsuario: {} as Record<number, number>,
    fallosCara: {} as Record<number, number>,
    /** Pasos de CLIENT_FaceInfoOpreate; el último se repite si hay más intentos. */
    pasos: [{ ok: true }] as Paso[],
    ultimoError: 0
  };

  /** Vector de referencia que "devuelve" el equipo (256 floats). */
  const eigen = new Float32Array(256);
  for (let i = 0; i < eigen.length; i++) eigen[i] = i / 256;
  const eigenBytes = Buffer.from(eigen.buffer.slice(0));

  /** Escribe el FAIL_CODE en el buffer que el código real reservó para él. */
  function escribirFallo(salida: Buffer, codigo: number): void {
    // GET contesta en pFailCode@16 (salida de 24); INSERT/REMOVE en @8 (de 16).
    const offset = salida.length >= 24 ? 16 : 8;
    const direccion = salida.readBigUInt64LE(offset);
    const buffer = direcciones.get(Number(direccion));
    if (buffer) buffer.writeInt32LE(codigo, 0);
  }

  const lib = {
    func(prototipo: string): (...args: any[]) => any {
      if (prototipo.includes('CLIENT_Init')) return () => fallos.initOk;
      if (prototipo.includes('CLIENT_LoginEx2')) {
        return (...args: any[]) => {
          registros.logins++;
          if (!fallos.loginOk) {
            (args[7] as Buffer).writeInt32LE(5, 0); // nError del equipo
            return 0;
          }
          return registros.sesion;
        };
      }
      if (prototipo.includes('CLIENT_Logout')) {
        return (sesion: number) => {
          registros.logout.push(sesion);
        };
      }
      if (prototipo.includes('CLIENT_GetLastError')) return () => registros.ultimoError;
      if (prototipo.includes('CLIENT_FaceInfoOpreate')) {
        return (_sesion: unknown, emTipo: number, _entrada: unknown, salida: Buffer) => {
          registros.faceInfo.push(emTipo);
          const paso =
            registros.pasos[Math.min(registros.faceInfo.length - 1, registros.pasos.length - 1)];
          if (!paso.ok) {
            registros.ultimoError = paso.codigo ?? 0;
            return false;
          }
          const nOut = paso.nOut ?? eigenBytes.length;
          if (nOut > 0) {
            const direccionVector = salida.readBigUInt64LE(16);
            const vector = direcciones.get(Number(direccionVector));
            if (vector) eigenBytes.copy(vector, 0, 0, Math.min(nOut, eigenBytes.length));
          }
          salida.writeUInt32LE(nOut, 8);
          return true;
        };
      }
      if (prototipo.includes('CLIENT_OperateAccessUserService')) {
        return (_sesion: unknown, emTipo: number, entrada: Buffer, salida: Buffer) => {
          registros.userService.push(emTipo);
          if (emTipo === 1) {
            const info = direcciones.get(Number(salida.readBigUInt64LE(8)))!;
            info.write('1001', 0);
            info.write('Nombre conservado', 32);
            if (!registros.perfilIncompleto) {
              info.writeInt32LE(1, 172);
              info.writeInt32LE(1, 304);
              info.writeInt32LE(255, 308);
              info.writeInt32LE(2025, 952);
              info.writeInt32LE(2035, 976);
            }
          } else if (emTipo === 0) {
            registros.usuarioInsertado = Buffer.from(
              direcciones.get(Number(entrada.readBigUInt64LE(8)))!
            );
          }
          escribirFallo(salida, registros.fallosUsuario[emTipo] ?? 0);
          return true;
        };
      }
      if (prototipo.includes('CLIENT_OperateAccessFaceService')) {
        return (_sesion: unknown, emTipo: number, _entrada: unknown, salida: Buffer) => {
          registros.faceService.push(emTipo);
          escribirFallo(salida, registros.fallosCara[emTipo] ?? 0);
          return true;
        };
      }
      throw new Error(`Prototipo del SDK no previsto en el test: ${prototipo}`);
    }
  };

  const koffi = {
    load: (ruta: string) => {
      registros.rutaLoad = ruta;
      registros.loads++;
      if (fallos.koffiLoadLanzaRaro) {
        // A propósito no es un Error: así se prueba la transcripción genérica.
        const raro: unknown = 'fallo plano';
        throw raro;
      }
      if (fallos.koffiLoadFalla) throw new Error('dhnetsdk.dll no se pudo cargar (simulado)');
      return lib;
    },
    proto: () => ({}),
    pointer: () => ({}),
    register: () => ({}),
    address: (buffer: Buffer) => {
      const direccion = proximaDireccion++;
      direcciones.set(direccion, buffer);
      return direccion;
    }
  };

  const reiniciar = () => {
    direcciones.clear();
    fallos.koffiLoadFalla = false;
    fallos.koffiLoadLanzaRaro = false;
    fallos.initOk = true;
    fallos.importFalla = false;
    fallos.loginOk = true;
    registros.loads = 0;
    registros.rutaLoad = '';
    registros.logins = 0;
    registros.logout = [];
    registros.userService = [];
    registros.perfilIncompleto = false;
    registros.usuarioInsertado = null;
    registros.faceService = [];
    registros.faceInfo = [];
    registros.fallosUsuario = {};
    registros.fallosCara = {};
    registros.pasos = [{ ok: true }];
    registros.ultimoError = 0;
    delete (globalThis as { __dahuaSdkFacial?: unknown }).__dahuaSdkFacial;
  };

  return { fallos, registros, eigen, koffi, reiniciar };
});

vi.mock('koffi', () => {
  if (sdk.fallos.importFalla) throw new Error('Cannot find module "koffi" (simulado)');
  return { default: sdk.koffi, ...sdk.koffi };
});

import {
  decidirCoincidencia,
  eliminarCaraEnEquipo,
  eliminarPersonaEnEquipo,
  ERROR_NO_SOPORTADO,
  ERROR_PARAMETRO_ILEGAL,
  ERROR_SIN_CARA,
  escribirTextoUtf8,
  extraerVectorFacial,
  guardarCaraEnEquipo,
  guardarPersonaEnEquipo,
  mensajeDeCodigoFacial,
  personaEnEquipo,
  similitudCoseno,
  UMBRAL_COINCIDENCIA_DEFECTO,
  umbralCoincidenciaFacial,
  vectorDesdeEigen
} from '@/lib/biometric/faceSdk';
import { NOMBRE_LIBRERIA } from '@/lib/biometric/netSdk';

const cred = { ip: '192.168.1.50', usuario: 'admin', clave: 'secreta' };

/** Carpeta temporal con una librería NatSDK de mentira para que cargarSdk avance. */
let carpetaSdk = '';

beforeAll(() => {
  carpetaSdk = fs.mkdtempSync(path.join(os.tmpdir(), 'dhnetsdk-falso-'));
  fs.writeFileSync(path.join(carpetaSdk, NOMBRE_LIBRERIA), '');
});

afterAll(() => {
  fs.rmSync(carpetaSdk, { recursive: true, force: true });
  delete process.env.DAHUA_SDK_DIR;
});

beforeEach(() => {
  sdk.reiniciar();
  process.env.DAHUA_SDK_DIR = carpetaSdk;
});

describe('similitudCoseno', () => {
  it('da 1 para el mismo vector, 0 para ortogonales y -1 para opuestos', () => {
    expect(similitudCoseno(new Float32Array([1, 0, 0]), new Float32Array([1, 0, 0]))).toBeCloseTo(
      1,
      6
    );
    expect(similitudCoseno(new Float32Array([1, 0]), new Float32Array([0, 1]))).toBeCloseTo(0, 6);
    expect(similitudCoseno(new Float32Array([1, 0]), new Float32Array([-1, 0]))).toBeCloseTo(-1, 6);
  });

  it('devuelve 0 cuando no se pueden comparar', () => {
    expect(similitudCoseno(new Float32Array([]), new Float32Array([]))).toBe(0);
    expect(similitudCoseno(new Float32Array([1]), new Float32Array([1, 2]))).toBe(0);
    expect(similitudCoseno(new Float32Array([0, 0]), new Float32Array([1, 0]))).toBe(0);
  });
});

describe('vectorDesdeEigen', () => {
  it('interpreta los 1024 bytes little-endian que devuelve el equipo', () => {
    const original = new Float32Array([0.5, -0.25, 1, 0]);
    const bytes = Buffer.from(original.buffer.slice(0));
    const vector = vectorDesdeEigen(bytes);
    expect(Array.from(vector)).toEqual([0.5, -0.25, 1, 0]);
  });

  it('ignora un resto que no completa un float', () => {
    const bytes = Buffer.concat([
      Buffer.from(new Float32Array([0.25]).buffer),
      Buffer.from([9, 9])
    ]);
    expect(Array.from(vectorDesdeEigen(bytes))).toEqual([0.25]);
  });
});

describe('umbralCoincidenciaFacial', () => {
  it('usa 0.7 por defecto y descarta valores inválidos', () => {
    expect(umbralCoincidenciaFacial({})).toBe(UMBRAL_COINCIDENCIA_DEFECTO);
    expect(umbralCoincidenciaFacial({ BIOMETRIC_FACE_MATCH_THRESHOLD: 'abc' })).toBe(0.7);
    expect(umbralCoincidenciaFacial({ BIOMETRIC_FACE_MATCH_THRESHOLD: '1.5' })).toBe(0.7);
    expect(umbralCoincidenciaFacial({ BIOMETRIC_FACE_MATCH_THRESHOLD: '0' })).toBe(0.7);
  });

  it('respeta el valor configurado por entorno', () => {
    expect(umbralCoincidenciaFacial({ BIOMETRIC_FACE_MATCH_THRESHOLD: '0.85' })).toBe(0.85);
  });
});

describe('decidirCoincidencia', () => {
  it('compara la similitud contra el umbral (incluido el borde)', () => {
    expect(decidirCoincidencia(0.91, 0.7)).toBe(true);
    expect(decidirCoincidencia(0.7, 0.7)).toBe(true);
    expect(decidirCoincidencia(0.12, 0.7)).toBe(false);
  });
});

describe('mensajeDeCodigoFacial', () => {
  it('traduce los códigos conocidos del NetSDK', () => {
    expect(mensajeDeCodigoFacial(ERROR_SIN_CARA).motivo).toBe('sin_cara');
    expect(mensajeDeCodigoFacial(ERROR_PARAMETRO_ILEGAL).motivo).toBe('foto_invalida');
    expect(mensajeDeCodigoFacial(ERROR_NO_SOPORTADO).motivo).toBe('no_soportado');
  });

  it('muestra el código hexadecimal para errores desconocidos', () => {
    const r = mensajeDeCodigoFacial(0x80000999);
    expect(r.motivo).toBe('error_desconocido');
    expect(r.mensaje).toContain('0x80000999');
  });
});

describe('escribirTextoUtf8', () => {
  it('trunca antes de partir un carácter multibyte y deja el \\0 final', () => {
    // "José " ocupa 6 bytes; el espacio y la Á ya no entran en 8 bytes.
    const buffer = Buffer.alloc(8);
    escribirTextoUtf8(buffer, 0, 8, 'José Álvarez');
    expect(buffer.toString('utf8', 0, buffer.indexOf(0))).toBe('José ');
    expect(buffer[7]).toBe(0);
  });

  it('escribe el texto completo cuando entra en el campo', () => {
    const buffer = Buffer.alloc(64);
    escribirTextoUtf8(buffer, 32, 32, 'Sebastián');
    expect(buffer.toString('utf8', 32, 32 + Buffer.byteLength('Sebastián'))).toBe('Sebastián');
  });
});

describe('guardarCaraEnEquipo', () => {
  it('rechaza un vector vacío sin abrir sesión contra el equipo', async () => {
    await expect(
      guardarCaraEnEquipo(
        { ip: '10.0.0.9', usuario: 'admin', clave: 'x' },
        '1001',
        new Float32Array()
      )
    ).rejects.toMatchObject({ name: 'ErrorFacial', motivo: 'foto_invalida' });

    expect(sdk.registros.logins).toBe(0);
  });
});

describe('cargarSdk (arranque del NetSDK)', () => {
  it('si falta la DLL explica dónde buscarla y cómo configurarla', async () => {
    process.env.DAHUA_SDK_DIR = path.join(os.tmpdir(), 'carpeta-que-no-existe');

    await expect(personaEnEquipo(cred, '1001')).rejects.toMatchObject({
      name: 'ErrorFacial',
      motivo: 'sdk_no_disponible',
      message: expect.stringMatching(/dhnetsdk[\s\S]*DAHUA_SDK_DIR/)
    });
    expect(sdk.registros.logins).toBe(0);
  });

  it('si koffi no puede cargar la DLL lo reporta', async () => {
    sdk.fallos.koffiLoadFalla = true;

    await expect(personaEnEquipo(cred, '1001')).rejects.toMatchObject({
      motivo: 'sdk_no_disponible',
      message: expect.stringContaining(`No se pudo cargar ${NOMBRE_LIBRERIA}`)
    });
  });

  it('si CLIENT_Init falló el SDK queda inservible', async () => {
    sdk.fallos.initOk = false;

    await expect(personaEnEquipo(cred, '1001')).rejects.toMatchObject({
      motivo: 'sdk_no_disponible',
      message: expect.stringContaining('CLIENT_Init falló')
    });
  });

  it('si koffi no está instalado lo dice explícitamente', async () => {
    vi.doMock('koffi', () => {
      throw new Error('Cannot find module "koffi" (simulado)');
    });
    try {
      // cargarSdk importa koffi en cada arranque sin caché: le pegamos ahí.
      await expect(personaEnEquipo(cred, '1001')).rejects.toMatchObject({
        motivo: 'sdk_no_disponible',
        message: expect.stringContaining('koffi')
      });
    } finally {
      // Restaura el doble para el resto de los tests del archivo.
      vi.doMock('koffi', () => ({ default: sdk.koffi, ...sdk.koffi }));
    }
  });

  it('el SDK se cachea: dos operaciones cargan koffi una sola vez', async () => {
    expect(await personaEnEquipo(cred, '1001')).toBe(true);
    expect(await personaEnEquipo(cred, '1002')).toBe(true);

    expect(sdk.registros.loads).toBe(1);
    expect(sdk.registros.logins).toBe(2);
    expect(sdk.registros.logout).toEqual([777, 777]);
  });

  it('si DAHUA_SDK_DIR está vacío usa la instalación por defecto de SmartPSS', async () => {
    delete process.env.DAHUA_SDK_DIR;

    const error = await personaEnEquipo(cred, '1001').then(
      () => null,
      (e: unknown) => e as { name: string; motivo: string; message: string }
    );

    if (error) {
      // Sin la DLL en la carpeta por defecto, informa dónde buscarla.
      expect(error).toMatchObject({
        name: 'ErrorFacial',
        motivo: 'sdk_no_disponible',
        message: expect.stringContaining('SmartPSSLite')
      });
    } else {
      // Con SmartPSS instalado en la ruta por defecto, cargó desde ahí.
      expect(sdk.registros.rutaLoad).toContain('SmartPSSLite');
      expect(sdk.registros.logins).toBe(1);
    }
  });

  it('si koffi se exporta sin default lo usa directo (CJS)', async () => {
    // La clave existe pero sin valor: es lo más cercano a un módulo CJS
    // sin interop de default que permite el mock de vitest.
    vi.doMock('koffi', () => ({ default: undefined, ...sdk.koffi }));
    try {
      expect(await personaEnEquipo(cred, '1001')).toBe(true);
    } finally {
      vi.doMock('koffi', () => ({ default: sdk.koffi, ...sdk.koffi }));
    }
  });

  it('si koffi.load lanza algo que no es un Error lo transcribe igual', async () => {
    sdk.fallos.koffiLoadLanzaRaro = true;

    await expect(personaEnEquipo(cred, '1001')).rejects.toMatchObject({
      motivo: 'sdk_no_disponible',
      message: expect.stringContaining(`No se pudo cargar ${NOMBRE_LIBRERIA}: fallo plano`)
    });
  });

  it('si el proceso no tiene PATH lo arma desde cero', async () => {
    const pathOriginal = process.env.PATH;
    delete process.env.PATH;
    try {
      expect(await personaEnEquipo(cred, '1001')).toBe(true);
      expect(process.env.PATH).toBe(`${path.delimiter}${carpetaSdk}`);
    } finally {
      process.env.PATH = pathOriginal;
    }
  });
});

describe('sesión NetSDK', () => {
  it('login rechazado lanza login_fallido con el código del equipo', async () => {
    sdk.fallos.loginOk = false;

    await expect(personaEnEquipo(cred, '1001')).rejects.toMatchObject({
      name: 'ErrorFacial',
      motivo: 'login_fallido',
      message: expect.stringMatching(/192\.168\.1\.50:37777[\s\S]*código 5/)
    });
    // No había sesión que cerrar: ni logout ni operaciones contra el equipo.
    expect(sdk.registros.logout).toHaveLength(0);
    expect(sdk.registros.userService).toHaveLength(0);
  });

  it('cierra la sesión con logout aunque la operación falle', async () => {
    sdk.registros.fallosUsuario[1] = 999;

    await expect(personaEnEquipo(cred, '1001')).rejects.toThrow('0x3e7');

    expect(sdk.registros.logout).toEqual([777]);
  });
});

describe('personaEnEquipo', () => {
  it('true cuando el GET de la persona responde OK', async () => {
    expect(await personaEnEquipo(cred, '1001')).toBe(true);
    expect(sdk.registros.userService).toEqual([1]); // solo GET, nada de INSERT
  });

  it('false cuando el equipo responde que no existe (16) o sin más registros (17)', async () => {
    sdk.registros.fallosUsuario[1] = 16;
    expect(await personaEnEquipo(cred, '1001')).toBe(false);

    sdk.registros.fallosUsuario[1] = 17;
    expect(await personaEnEquipo(cred, '1001')).toBe(false);
  });

  it('otros fallos de consulta se propagan como ErrorFacial', async () => {
    sdk.registros.fallosUsuario[1] = 11;

    await expect(personaEnEquipo(cred, '1001')).rejects.toMatchObject({
      name: 'ErrorFacial',
      motivo: 'equipo_lleno'
    });
  });
});

describe('guardarPersonaEnEquipo', () => {
  it('repara permisos vacíos conservando los datos de una persona existente', async () => {
    sdk.registros.perfilIncompleto = true;
    expect(await guardarPersonaEnEquipo(cred, { codigo: '1001', nombre: 'Otro nombre' })).toBe(
      'ya_existia'
    );
    expect(sdk.registros.userService).toEqual([1, 0]);
    const info = sdk.registros.usuarioInsertado!;
    expect(info.subarray(32, 49).toString()).toBe('Nombre conservado');
    expect(info.readInt32LE(172)).toBe(1);
    expect(info.readInt32LE(176)).toBe(0);
    expect(info.readInt32LE(304)).toBe(1);
    expect(info.readInt32LE(308)).toBe(255);
    expect(info.readInt32LE(952)).toBe(new Date().getUTCFullYear());
    expect(info.readInt32LE(976)).toBe(new Date().getUTCFullYear() + 10);
  });
  it('consulta primero y si no está la crea (alta idempotente)', async () => {
    sdk.registros.fallosUsuario[1] = 16; // GET: NO_RECORD

    expect(await guardarPersonaEnEquipo(cred, { codigo: '1001', nombre: 'Ana' })).toBe('creada');
    expect(sdk.registros.userService).toEqual([1, 0]); // GET y luego INSERT
  });

  it('si ya está dada de alta no vuelve a insertar', async () => {
    expect(await guardarPersonaEnEquipo(cred, { codigo: '1001', nombre: 'Ana' })).toBe(
      'ya_existia'
    );
    expect(sdk.registros.userService).toEqual([1]);
  });

  it('un INSERT duplicado se toma como que ya existía (18 y el 24 del ASI)', async () => {
    sdk.registros.fallosUsuario[1] = 16;
    sdk.registros.fallosUsuario[0] = 18;
    expect(await guardarPersonaEnEquipo(cred, { codigo: '1001', nombre: 'Ana' })).toBe(
      'ya_existia'
    );

    sdk.registros.userService = [];
    sdk.registros.fallosUsuario[0] = 24;
    expect(await guardarPersonaEnEquipo(cred, { codigo: '1001', nombre: 'Ana' })).toBe(
      'ya_existia'
    );
    expect(sdk.registros.userService).toEqual([1, 0]);
  });

  it('los demás códigos de fallo del INSERT se traducen', async () => {
    const casos: Array<[number, string, string]> = [
      [11, 'equipo_lleno', 'límite'],
      [2, 'error_desconocido', 'parámetros inválidos'],
      [5, 'foto_invalida', 'vector facial'],
      [7, 'error_desconocido', 'usuario inválido'],
      [12, 'error_desconocido', 'velocidad'],
      [999, 'error_desconocido', '0x3e7']
    ];

    for (const [codigo, motivo, fragmento] of casos) {
      sdk.registros.fallosUsuario = { 1: 16, 0: codigo };
      await expect(
        guardarPersonaEnEquipo(cred, { codigo: '1001', nombre: 'Ana' })
      ).rejects.toMatchObject({
        name: 'ErrorFacial',
        motivo,
        message: expect.stringContaining(fragmento)
      });
    }
  });
});

describe('guardarCaraEnEquipo (contra el equipo)', () => {
  it('inserta la cara cuando todavía no tiene', async () => {
    expect(await guardarCaraEnEquipo(cred, '1001', sdk.eigen)).toBe('cargada');
    expect(sdk.registros.faceService).toEqual([0]);
  });

  it('si ya tiene cara la actualiza (duplicado 18)', async () => {
    sdk.registros.fallosCara[0] = 18;

    expect(await guardarCaraEnEquipo(cred, '1001', sdk.eigen)).toBe('actualizada');
    expect(sdk.registros.faceService).toEqual([0, 2]); // INSERT y luego UPDATE
  });

  it('el firmware ASI devuelve 24 al repetir el INSERT de una cara', async () => {
    sdk.registros.fallosCara[0] = 24;

    expect(await guardarCaraEnEquipo(cred, '1001', sdk.eigen)).toBe('actualizada');
    expect(sdk.registros.faceService).toEqual([0, 2]);
  });

  it('si la actualización falla propaga el error del equipo', async () => {
    sdk.registros.fallosCara[0] = 18;
    sdk.registros.fallosCara[2] = 11;

    await expect(guardarCaraEnEquipo(cred, '1001', sdk.eigen)).rejects.toMatchObject({
      motivo: 'equipo_lleno'
    });
  });

  it('un fallo distinto de duplicado se reporta tal cual', async () => {
    sdk.registros.fallosCara[0] = 2;

    await expect(guardarCaraEnEquipo(cred, '1001', sdk.eigen)).rejects.toMatchObject({
      motivo: 'error_desconocido',
      message: expect.stringContaining('cargar la cara')
    });
  });
});

describe('eliminarPersonaEnEquipo', () => {
  it('true cuando el equipo confirma el borrado', async () => {
    expect(await eliminarPersonaEnEquipo(cred, '1001')).toBe(true);
    expect(sdk.registros.userService).toEqual([2]); // REMOVE
  });

  it('false si ya no estaba (idempotente: 16 y 17)', async () => {
    sdk.registros.fallosUsuario[2] = 16;
    expect(await eliminarPersonaEnEquipo(cred, '1001')).toBe(false);

    sdk.registros.fallosUsuario[2] = 17;
    expect(await eliminarPersonaEnEquipo(cred, '1001')).toBe(false);
  });

  it('otros fallos se propagan con la acción en el mensaje', async () => {
    sdk.registros.fallosUsuario[2] = 999;

    await expect(eliminarPersonaEnEquipo(cred, '1001')).rejects.toThrow(
      '0x3e7 al quitar a la persona'
    );
  });
});

describe('eliminarCaraEnEquipo', () => {
  it('true cuando el equipo confirma el borrado', async () => {
    expect(await eliminarCaraEnEquipo(cred, '1001')).toBe(true);
    expect(sdk.registros.faceService).toEqual([3]); // REMOVE de cara
  });

  it('false si la cara ya no estaba', async () => {
    sdk.registros.fallosCara[3] = 16;
    expect(await eliminarCaraEnEquipo(cred, '1001')).toBe(false);
  });

  it('otros fallos se propagan con la acción en el mensaje', async () => {
    sdk.registros.fallosCara[3] = 999;

    await expect(eliminarCaraEnEquipo(cred, '1001')).rejects.toThrow('0x3e7 al quitar la cara');
  });
});

describe('extraerVectorFacial', () => {
  it('rechaza una foto vacía sin siquiera loguearse', async () => {
    await expect(extraerVectorFacial(cred, Buffer.alloc(0))).rejects.toMatchObject({
      name: 'ErrorFacial',
      motivo: 'foto_invalida',
      message: 'La foto llegó vacía.'
    });
    expect(sdk.registros.logins).toBe(0);
  });

  it('rechaza una foto más pesada que el máximo del equipo', async () => {
    await expect(extraerVectorFacial(cred, Buffer.alloc(200_001))).rejects.toMatchObject({
      motivo: 'foto_invalida',
      message: expect.stringMatching(/195 KB[\s\S]*200 KB/)
    });
    expect(sdk.registros.logins).toBe(0);
  });

  it('devuelve los 256 floats que extrajo el motor del equipo', async () => {
    const vector = await extraerVectorFacial(cred, Buffer.alloc(1_000, 0xff));

    expect(vector).toHaveLength(256);
    expect(Array.from(vector)).toEqual(Array.from(sdk.eigen));
    expect(sdk.registros.faceInfo).toEqual([5]); // EM_FACEINFO_OPREATE_GETFACEEIGEN
    expect(sdk.registros.logout).toEqual([777]);
  });

  it('un fallo determinista (sin cara) no se reintenta', async () => {
    sdk.registros.pasos = [{ ok: false, codigo: ERROR_SIN_CARA }];

    await expect(extraerVectorFacial(cred, Buffer.alloc(1_000))).rejects.toMatchObject({
      motivo: 'sin_cara'
    });
    expect(sdk.registros.faceInfo).toHaveLength(1);
  });

  it('ante un error indeterminado reintenta una vez a los 500 ms', async () => {
    sdk.registros.pasos = [{ ok: false, codigo: 0x80000002 }, { ok: true }];

    const vector = await extraerVectorFacial(cred, Buffer.alloc(1_000));

    expect(vector).toHaveLength(256);
    expect(sdk.registros.faceInfo).toHaveLength(2);
    // Cada intento abre su propia sesión NetSDK.
    expect(sdk.registros.logout).toEqual([777, 777]);
  }, 5_000);

  it('si el reintento también falla devuelve error_desconocido', async () => {
    sdk.registros.pasos = [{ ok: false, codigo: 0x80000002 }];

    await expect(extraerVectorFacial(cred, Buffer.alloc(1_000))).rejects.toMatchObject({
      name: 'ErrorFacial',
      motivo: 'error_desconocido'
    });
    expect(sdk.registros.faceInfo).toHaveLength(2);
  }, 5_000);

  it('si el equipo no devuelve vector lo intenta de nuevo', async () => {
    sdk.registros.pasos = [{ ok: true, nOut: 0 }, { ok: true }];

    const vector = await extraerVectorFacial(cred, Buffer.alloc(1_000));

    expect(vector).toHaveLength(256);
    expect(sdk.registros.faceInfo).toHaveLength(2);
  }, 5_000);

  it('si el login falla lo reporta sin extraer nada', async () => {
    sdk.fallos.loginOk = false;

    await expect(extraerVectorFacial(cred, Buffer.alloc(1_000))).rejects.toMatchObject({
      motivo: 'login_fallido'
    });
    expect(sdk.registros.faceInfo).toHaveLength(0);
  });
});
