// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Fotos de verificación: descarga por NetSDK (`CLIENT_DownloadRemoteFile`)
 * y cola en segundo plano. El SDK real y la base se mockean por completo:
 * acá se valida la estructura de los structs, las formas de falla y que la
 * cola persista el JPEG en `biometric_device_records.foto`.
 */

const db = vi.hoisted(() => ({ queryMock: vi.fn() }));
const sdk = vi.hoisted(() => ({ libreriaNet: vi.fn() }));
/** Buffers cuya dirección pidió el módulo (koffi.address los numeró desde 1). */
const direcciones = vi.hoisted(() => [] as Buffer[]);

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'uuid-test'
}));

vi.mock('@/modules/asistencia/biometrico/audioSdk', () => ({ libreriaNet: sdk.libreriaNet }));

vi.mock('koffi', () => ({
  default: {
    address: (buffer: Buffer) => {
      direcciones.push(buffer);
      return direcciones.length;
    }
  }
}));

vi.mock('@/modules/asistencia/biometrico/deviceClient', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/modules/asistencia/biometrico/deviceClient')>();
  return {
    ...actual,
    credencialesDeFila: vi.fn(() => ({ ip: '192.168.0.5', usuario: 'admin', clave: 'secreta' }))
  };
});

vi.mock('@/lib/utils/logger', () => {
  const mocks = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
  return { logger: mocks, default: mocks };
});

// La cadena foto → identificación 1:N tampoco debe tocar el SDK real.
const ident = vi.hoisted(() => ({
  encolarIdentificacionDeRecord: vi.fn(),
  recuperarIdentificacionesPendientes: vi.fn()
}));
vi.mock('@/modules/asistencia/biometrico/identificacionFacial', () => ident);

import {
  descargarFoto,
  encolarFotoDeRecord,
  recuperarFotosPendientes
} from '@/modules/asistencia/biometrico/recordPhotos';

const cred = { ip: '192.168.0.5', usuario: 'admin', clave: 'secreta' };
const RUTA = '/SnapShotFilePath/2026-10-02/09/00/1001_99_100.jpg';
const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.from('foto-de-la-puerta'),
  Buffer.from([0xff, 0xd9])
]);

/** Librería falsa: expone login/logout/download como el koffi real. */
function libFalsa(descarga: (entrada: Buffer, salida: Buffer) => boolean) {
  const logout = vi.fn();
  const login = vi.fn(() => 77);
  const download = vi.fn((_h: number, entrada: Buffer, salida: Buffer) =>
    descarga(entrada, salida)
  );
  return {
    logout,
    login,
    download,
    lib: {
      func: (prototipo: string) => {
        if (prototipo.includes('CLIENT_DownloadRemoteFile')) return download;
        if (prototipo.includes('CLIENT_LoginEx2')) return login;
        if (prototipo.includes('CLIENT_Logout')) return logout;
        throw new Error(`no expone ${prototipo}`);
      }
    }
  };
}

/** Descarga "exitosa": llena el buffer de salida con JPEG y reporta el largo. */
function llenarConJpeg(salida: Buffer): boolean {
  const destino = direcciones[Number(salida.readBigUInt64LE(8)) - 1];
  JPEG.copy(destino);
  salida.writeUInt32LE(JPEG.length, 16);
  return true;
}

beforeEach(() => {
  db.queryMock.mockReset();
  sdk.libreriaNet.mockReset();
  direcciones.length = 0;
  ident.encolarIdentificacionDeRecord.mockClear();
});

describe('descargarFoto', () => {
  it('arma los structs x64 y devuelve el JPEG que trae el equipo', async () => {
    const armado = libFalsa((entrada, salida) => {
      // NET_IN_DOWNLOAD_REMOTE_FILE: dwSize@0, ruta@8 (sin destino en disco).
      expect(entrada.readUInt32LE(0)).toBe(24);
      expect(entrada.readUInt32LE(4)).toBe(0);
      expect(entrada.readBigUInt64LE(16)).toBe(0n);
      // La dirección 1 es el buffer de la ruta.
      expect(direcciones[0].toString('utf8')).toBe(`${RUTA}\0`);
      // NET_OUT: dwSize@0, maximo@4, buffer@8.
      expect(salida.readUInt32LE(0)).toBe(24);
      expect(salida.readUInt32LE(4)).toBeGreaterThan(JPEG.length);
      return llenarConJpeg(salida);
    });
    sdk.libreriaNet.mockResolvedValue(armado.lib);

    const foto = await descargarFoto(RUTA, cred);

    expect(foto?.equals(JPEG)).toBe(true);
    expect(armado.login).toHaveBeenCalledWith(
      '192.168.0.5',
      37777,
      'admin',
      'secreta',
      0,
      null,
      expect.any(Buffer),
      expect.any(Buffer)
    );
    expect(armado.logout).toHaveBeenCalledWith(77);
  });

  it('si la descarga no es un JPEG la descarta', async () => {
    const armado = libFalsa((_entrada, salida) => {
      Buffer.from('P6 3 2 255').copy(direcciones[Number(salida.readBigUInt64LE(8)) - 1]);
      salida.writeUInt32LE(11, 16);
      return true;
    });
    sdk.libreriaNet.mockResolvedValue(armado.lib);

    await expect(descargarFoto(RUTA, cred)).resolves.toBeNull();
    expect(armado.logout).toHaveBeenCalled(); // la sesión se cierra igual
  });

  it('si el equipo no devuelve bytes, null (la sesión se cierra igual)', async () => {
    const armado = libFalsa((_entrada, salida) => {
      salida.writeUInt32LE(0, 16);
      return false;
    });
    sdk.libreriaNet.mockResolvedValue(armado.lib);

    await expect(descargarFoto(RUTA, cred)).resolves.toBeNull();
    expect(armado.logout).toHaveBeenCalledWith(77);
  });

  it('si el login del NetSDK es rechazado, null', async () => {
    const armado = libFalsa(() => true);
    armado.login.mockReturnValue(0);
    sdk.libreriaNet.mockResolvedValue(armado.lib);

    await expect(descargarFoto(RUTA, cred)).resolves.toBeNull();
    expect(armado.download).not.toHaveBeenCalled();
  });

  it('si la DLL no expone CLIENT_DownloadRemoteFile, null sin reventar', async () => {
    sdk.libreriaNet.mockResolvedValue({
      func: () => {
        throw new Error('Cannot find function');
      }
    });

    await expect(descargarFoto(RUTA, cred)).resolves.toBeNull();
  });

  it('si el SDK no está disponible (sin DLL), null', async () => {
    sdk.libreriaNet.mockRejectedValue(new Error('No se encontró dhnetsdk.dll'));

    await expect(descargarFoto(RUTA, cred)).resolves.toBeNull();
  });
});

describe('cola de descarga', () => {
  function instalarEquipo() {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM biometric_devices'))
        return [{ ip: '192.168.0.5', usuario_equipo: 'admin', clave_cifrada: 'a.b.c' }];
      if (sql.includes('UPDATE biometric_device_records')) return [];
      return [];
    });
  }

  it('descarga la foto y la guarda en biometric_device_records.foto', async () => {
    instalarEquipo();
    const armado = libFalsa((entrada, salida) => {
      expect(entrada.readBigUInt64LE(8)).toBe(1n); // la ruta sigue siendo la 1.ª dirección
      return llenarConJpeg(salida);
    });
    sdk.libreriaNet.mockResolvedValue(armado.lib);

    encolarFotoDeRecord({ recordId: 'record-1', dispositivoId: 'dev-1', ruta: RUTA });

    await vi.waitFor(() => {
      const update = db.queryMock.mock.calls.find(call =>
        String(call[0]).includes('UPDATE biometric_device_records')
      );
      expect(update).toBeTruthy();
      expect(String(update?.[0])).toContain('SET foto = ?');
      expect(update?.[1][0].equals(JPEG)).toBe(true);
      expect(update?.[1][1]).toBe('record-1');
    });
    // Con la foto guardada, el 1:N se encadena en la misma corrida.
    expect(ident.encolarIdentificacionDeRecord).toHaveBeenCalledWith({
      recordId: 'record-1',
      dispositivoId: 'dev-1'
    });
  });

  it('un record ya en vuelo no se encola dos veces', async () => {
    instalarEquipo();
    const armado = libFalsa((_entrada, salida) => llenarConJpeg(salida));
    sdk.libreriaNet.mockResolvedValue(armado.lib);

    encolarFotoDeRecord({ recordId: 'record-2', dispositivoId: 'dev-1', ruta: RUTA });
    encolarFotoDeRecord({ recordId: 'record-2', dispositivoId: 'dev-1', ruta: RUTA });

    await vi.waitFor(() => {
      expect(armado.download).toHaveBeenCalledTimes(1);
    });
  });
});

describe('recuperarFotosPendientes', () => {
  it('reintenta solo las filas con foto_url y devuelve cuántas retomó', async () => {
    const armado = libFalsa((_entrada, salida) => llenarConJpeg(salida));
    sdk.libreriaNet.mockResolvedValue(armado.lib);
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id, dispositivo_id, foto_url')) {
        return [
          { id: 'r-1', dispositivo_id: 'dev-1', foto_url: '/SnapShotFilePath/a.jpg' },
          { id: 'r-2', dispositivo_id: 'dev-1', foto_url: null }
        ];
      }
      if (sql.includes('FROM biometric_devices'))
        return [{ ip: '192.168.0.5', usuario_equipo: 'admin', clave_cifrada: 'a.b.c' }];
      return [];
    });

    const total = await recuperarFotosPendientes(3);

    expect(total).toBe(2);
    await vi.waitFor(() => {
      const descargas = db.queryMock.mock.calls.filter(call =>
        String(call[0]).includes('UPDATE biometric_device_records')
      );
      // Solo r-1: la fila sin foto_url no genera descarga.
      expect(descargas.length).toBe(1);
      expect(descargas[0][1][1]).toBe('r-1');
    });
  });
});
