// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ queryMock: vi.fn() }));
const puerta = vi.hoisted(() => ({ abrirPuerta: vi.fn() }));
const ident = vi.hoisted(() => ({ identificarImagen: vi.fn() }));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: vi.fn(),
  withTransaction: vi.fn()
}));

vi.mock('@/modules/asistencia/biometrico/puertaClient', () => ({
  abrirPuerta: puerta.abrirPuerta
}));

vi.mock('@/modules/asistencia/biometrico/identificacionFacial', () => ({
  identificarImagen: ident.identificarImagen
}));

vi.mock('@/lib/utils/logger', () => {
  const mocks = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
  return { logger: mocks, default: mocks };
});

vi.mock('@/modules/asistencia/biometrico/deviceClient', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/modules/asistencia/biometrico/deviceClient')>();
  return {
    ...actual,
    credencialesDeFila: vi.fn((fila: { ip: string | null }) =>
      fila.ip ? { ip: fila.ip, usuario: 'admin', clave: 'x' } : null
    )
  };
});

import { evaluarVerificacionRemota } from '@/modules/asistencia/biometrico/verificacionRemota';
import {
  DeviceConnectionError,
  DeviceAuthError
} from '@/modules/asistencia/biometrico/deviceClient';
import { ErrorFacial } from '@/modules/asistencia/biometrico/faceSdk';

const DISPOSITIVO = 'dev-1';
const SERIAL = 'BF013C7PAJB4D74';
const FOTO = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

function filaEquipo(verificacionRemota: number, ip: string | null = '10.62.213.212') {
  return {
    verificacion_remota: verificacionRemota,
    ip,
    usuario_equipo: 'admin',
    clave_cifrada: 'a.b.c'
  };
}

function instalarConsultas(fila: Record<string, unknown> | null, codigo: string | null = null) {
  db.queryMock.mockImplementation(async (sql: string) => {
    const s = String(sql);
    if (s.includes('verificacion_remota')) return fila ? [fila] : [];
    if (s.includes('biometrico_codigo')) return codigo ? [{ codigo }] : [];
    return [];
  });
}

beforeEach(() => {
  db.queryMock.mockReset();
  puerta.abrirPuerta.mockReset().mockResolvedValue(undefined);
  ident.identificarImagen.mockReset().mockResolvedValue(null);
});

describe('evaluarVerificacionRemota', () => {
  it('sin imagen no consulta nada ni abre', async () => {
    const resultado = await evaluarVerificacionRemota({
      dispositivoId: DISPOSITIVO,
      serial: SERIAL,
      foto: null
    });

    expect(resultado).toEqual({ decision: 'sin_imagen' });
    expect(db.queryMock).not.toHaveBeenCalled();
    expect(puerta.abrirPuerta).not.toHaveBeenCalled();
  });

  it('foto vacía también cuenta como sin imagen', async () => {
    const resultado = await evaluarVerificacionRemota({
      dispositivoId: DISPOSITIVO,
      serial: SERIAL,
      foto: Buffer.alloc(0)
    });

    expect(resultado).toEqual({ decision: 'sin_imagen' });
    expect(ident.identificarImagen).not.toHaveBeenCalled();
  });

  it('equipo con la vía apagada: deshabilitado sin identificar', async () => {
    instalarConsultas(filaEquipo(0));

    const resultado = await evaluarVerificacionRemota({
      dispositivoId: DISPOSITIVO,
      serial: SERIAL,
      foto: FOTO
    });

    expect(resultado).toEqual({ decision: 'deshabilitado' });
    expect(ident.identificarImagen).not.toHaveBeenCalled();
    expect(puerta.abrirPuerta).not.toHaveBeenCalled();
  });

  it('equipo habilitado pero sin IP: sin_equipo', async () => {
    instalarConsultas(filaEquipo(1, null));

    const resultado = await evaluarVerificacionRemota({
      dispositivoId: DISPOSITIVO,
      serial: SERIAL,
      foto: FOTO
    });

    expect(resultado).toEqual({ decision: 'sin_equipo' });
    expect(puerta.abrirPuerta).not.toHaveBeenCalled();
  });

  it('identificado: abre la puerta con el código reclamado por el evento', async () => {
    instalarConsultas(filaEquipo(1));
    ident.identificarImagen.mockResolvedValue({ usuarioId: 'usuario-a', similitud: 0.83 });

    const resultado = await evaluarVerificacionRemota({
      dispositivoId: DISPOSITIVO,
      serial: SERIAL,
      foto: FOTO,
      codigoReclamado: ' 7788 '
    });

    expect(resultado).toEqual({
      decision: 'abierto',
      usuarioId: 'usuario-a',
      similitud: 0.83
    });
    expect(puerta.abrirPuerta).toHaveBeenCalledWith(
      { ip: '10.62.213.212', usuario: 'admin', clave: 'x' },
      { canal: 1, usuarioId: '7788' }
    );
    expect(db.queryMock.mock.calls.map(c => String(c[0])).join()).not.toContain(
      'biometrico_codigo'
    );
  });

  it('sin código reclamado busca el biometrico_codigo del identificado', async () => {
    instalarConsultas(filaEquipo(1), '1001');
    ident.identificarImagen.mockResolvedValue({ usuarioId: 'usuario-a', similitud: 0.9 });

    const resultado = await evaluarVerificacionRemota({
      dispositivoId: DISPOSITIVO,
      serial: SERIAL,
      foto: FOTO
    });

    expect(resultado.decision).toBe('abierto');
    expect(puerta.abrirPuerta).toHaveBeenCalledWith(expect.anything(), {
      canal: 1,
      usuarioId: '1001'
    });
  });

  it('nadie pasa el umbral: la puerta no se toca', async () => {
    instalarConsultas(filaEquipo(1));
    ident.identificarImagen.mockResolvedValue(null);

    const resultado = await evaluarVerificacionRemota({
      dispositivoId: DISPOSITIVO,
      serial: SERIAL,
      foto: FOTO
    });

    expect(resultado).toEqual({ decision: 'sin_coincidencia' });
    expect(puerta.abrirPuerta).not.toHaveBeenCalled();
  });

  it('captura sin cara es resultado propio, no error', async () => {
    instalarConsultas(filaEquipo(1));
    ident.identificarImagen.mockRejectedValue(new ErrorFacial('sin_cara', 'no hay cara'));

    const resultado = await evaluarVerificacionRemota({
      dispositivoId: DISPOSITIVO,
      serial: SERIAL,
      foto: FOTO
    });

    expect(resultado).toEqual({ decision: 'sin_cara' });
    expect(puerta.abrirPuerta).not.toHaveBeenCalled();
  });

  it('fallo transitorio del SDK se reporta como error', async () => {
    instalarConsultas(filaEquipo(1));
    ident.identificarImagen.mockRejectedValue(new ErrorFacial('login_fallido', 'login rechazado'));

    const resultado = await evaluarVerificacionRemota({
      dispositivoId: DISPOSITIVO,
      serial: SERIAL,
      foto: FOTO
    });

    expect(resultado).toEqual({ decision: 'error', mensaje: 'login rechazado' });
    expect(puerta.abrirPuerta).not.toHaveBeenCalled();
  });

  it('identificado pero el equipo no abre: error con el motivo', async () => {
    instalarConsultas(filaEquipo(1));
    ident.identificarImagen.mockResolvedValue({ usuarioId: 'usuario-a', similitud: 0.88 });
    puerta.abrirPuerta.mockRejectedValue(new DeviceConnectionError('timeout del equipo'));

    const resultado = await evaluarVerificacionRemota({
      dispositivoId: DISPOSITIVO,
      serial: SERIAL,
      foto: FOTO
    });

    expect(resultado).toEqual({ decision: 'error', mensaje: 'timeout del equipo' });
  });

  it('credenciales inválidas al abrir quedan en error, no tiran la evaluación', async () => {
    instalarConsultas(filaEquipo(1));
    ident.identificarImagen.mockResolvedValue({ usuarioId: 'usuario-a', similitud: 0.95 });
    puerta.abrirPuerta.mockRejectedValue(new DeviceAuthError('Usuario o clave incorrectos'));

    const resultado = await evaluarVerificacionRemota({
      dispositivoId: DISPOSITIVO,
      serial: SERIAL,
      foto: FOTO
    });

    expect(resultado.decision).toBe('error');
  });
});
