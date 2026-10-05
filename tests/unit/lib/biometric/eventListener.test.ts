// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/modules/asistencia/biometrico/eventSdkClient', () => ({
  abrirAvisosSdk: vi.fn().mockRejectedValue(new Error('SDK unavailable in test'))
}));
vi.mock('@/modules/asistencia/biometrico/recordPoller', () => ({
  pollEquipo: vi.fn().mockResolvedValue({})
}));
import { abrirAvisosSdk } from '@/modules/asistencia/biometrico/eventSdkClient';
import { pollEquipo } from '@/modules/asistencia/biometrico/recordPoller';

/**
 * Tests del listener EN VIVO por equipo (eventManager.cgi?action=attach):
 *   - procesamiento de los eventos que llegan por el stream (dedupe, método,
 *     status del equipo, errores de procesamiento),
 *   - ciclo de vida del supervisor: credenciales ausentes, firmware sin
 *     stream, desconexión y backoff exponencial de reconexión.
 *
 * El stream se mockea (`abrirFlujoEventos`) para capturar los handlers y
 * dispararlos a mano: así se ejercita `manejarEvento` y el supervisor sin un
 * equipo físico ni backoffs reales de 5 s.
 */

const db = vi.hoisted(() => ({ queryMock: vi.fn() }));
const cliente = vi.hoisted(() => ({ credencialesDeFila: vi.fn() }));
const procesar = vi.hoisted(() => ({ fn: vi.fn() }));
const insercion = vi.hoisted(() => ({ fn: vi.fn() }));
const bitacora = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
}));
const tz = vi.hoisted(() => ({ fn: vi.fn(() => '2026-09-29 21:30:00') }));
const flujo = vi.hoisted(() => ({
  modo: 'conecta' as 'conecta' | 'noSoportado' | 'error',
  opciones: null as null | {
    onEvento: (evento: unknown) => Promise<void>;
    onChunk?: (texto: string) => void;
    onError?: (error: unknown) => void;
  },
  conexiones: 0
}));

/** Estado de las respuestas de DB que cada test ajusta. */
const estado = vi.hoisted(() => ({
  equipoRevocado: false,
  eventoYaVisto: false,
  equiposBoot: [{ id: 'dev-1' }] as Array<{ id: string }>
}));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'uuid-test',
  withTransaction: vi.fn()
}));

vi.mock('@/lib/business/timezoneService', () => ({ getNowInBusinessTimezone: tz.fn }));

vi.mock('@/modules/asistencia/biometrico/processBiometricEvent', () => ({
  procesarEventoBiometrico: procesar.fn
}));

vi.mock('@/modules/asistencia/biometrico/deviceClient', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/modules/asistencia/biometrico/deviceClient')>();
  return { ...actual, ...cliente };
});

vi.mock('@/modules/asistencia/biometrico/eventStreamClient', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/modules/asistencia/biometrico/eventStreamClient')>();
  return {
    ...actual,
    abrirFlujoEventos: async (
      _credenciales: unknown,
      opciones: {
        onEvento: (evento: unknown) => Promise<void>;
        onChunk?: (texto: string) => void;
        onError?: (error: unknown) => void;
      }
    ) => {
      flujo.conexiones++;
      if (flujo.modo === 'noSoportado') throw new actual.EventManagerNoSoportadoError();
      if (flujo.modo === 'error') throw new Error('El equipo rechazó la conexión (simulada)');
      flujo.opciones = opciones;
      // En el caso real resuelve cuando la conexión quedó establecida.
    }
  };
});

vi.mock('@/lib/database/base-repository', () => ({
  BaseRepository: { insert: insercion.fn }
}));

vi.mock('@/lib/utils/logger', () => ({
  default: bitacora,
  logger: bitacora,
  auditLogger: {
    login: vi.fn(),
    logout: vi.fn(),
    dataAccess: vi.fn(),
    securityEvent: vi.fn(),
    error: vi.fn()
  }
}));

import {
  apagarListener,
  conectadosEnVivo,
  encenderListener,
  encenderTodos,
  listenersActivos
} from '@/modules/asistencia/biometrico/eventListener';

const equipo = {
  id: 'dev-1',
  serial: 'SERIAL1',
  recoger_registros: 1,
  ip: '192.168.1.50',
  usuario_equipo: 'admin',
  clave_cifrada: 'a.b.c'
};

const cred = { ip: '192.168.1.50', usuario: 'admin', clave: 'x' };

/** Drena la cadena de microtareas del supervisor (todo su I/O es mockeado). */
const fluir = async (veces = 50) => {
  for (let i = 0; i < veces; i++) await Promise.resolve();
};

const evento = (sobrescribir: Record<string, unknown> = {}) => ({
  createTime: 1790715000,
  userId: '1001',
  tipo: 'Entry',
  status: 1,
  metodo: 15,
  code: 'AccessControl',
  raw: 'Events[0].UserID=1001',
  ...sobrescribir
});

beforeEach(() => {
  vi.mocked(abrirAvisosSdk).mockReset().mockRejectedValue(new Error('SDK unavailable in test'));
  vi.mocked(pollEquipo).mockClear();
  db.queryMock.mockReset();
  cliente.credencialesDeFila.mockReset();
  procesar.fn.mockReset();
  insercion.fn.mockReset();
  tz.fn.mockClear();
  bitacora.info.mockClear();
  bitacora.warn.mockClear();
  bitacora.error.mockClear();

  flujo.modo = 'conecta';
  flujo.opciones = null;
  flujo.conexiones = 0;
  estado.equipoRevocado = false;
  estado.eventoYaVisto = false;
  estado.equiposBoot = [{ id: 'dev-1' }];

  db.queryMock.mockImplementation(async (sql: string) => {
    if (sql.includes('biometric_device_records')) {
      return estado.eventoYaVisto ? [{ id: 'record-1' }] : [];
    }
    if (sql.includes('recoger_registros = 1')) return estado.equiposBoot;
    if (estado.equipoRevocado) return [];
    return [equipo];
  });
  cliente.credencialesDeFila.mockReturnValue(cred);
  procesar.fn.mockResolvedValue({ resultado: 'registrado' });
  insercion.fn.mockResolvedValue(undefined);
});

afterEach(async () => {
  apagarListener('dev-1');
  apagarListener('dev-2');
  await fluir();
  estado.equipoRevocado = false;
  estado.eventoYaVisto = false;
});

/** Enciende el listener y espera a que el stream quede establecido. */
async function conectar(): Promise<{ onEvento: (evento: unknown) => Promise<void> }> {
  expect(await encenderListener('dev-1')).toBe(true);
  await fluir();
  expect(flujo.opciones).not.toBeNull();
  return flujo.opciones!;
}

describe('procesamiento de eventos en vivo', () => {
  it('prefiere NetSDK y recupera registros al recibir un aviso nativo', async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(abrirAvisosSdk).mockResolvedValue(undefined);
      await encenderListener('dev-1');
      await fluir();
      expect(flujo.conexiones).toBe(0);
      expect(conectadosEnVivo()).toContain('dev-1');
      vi.mocked(abrirAvisosSdk).mock.calls[0][1].onAviso();
      await vi.advanceTimersByTimeAsync(100);
      expect(pollEquipo).toHaveBeenCalledWith('dev-1');
      apagarListener('dev-1');
      await vi.advanceTimersByTimeAsync(2000);
      expect(pollEquipo).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
  it('marca el evento como visto, lo procesa y loguea el resultado', async () => {
    const { onEvento } = await conectar();

    await onEvento(evento());

    // Dedupe: se registró el record antes de procesar.
    // BaseRepository.insert(query, tabla, datos)
    const insercionDatos = insercion.fn.mock.calls[0]?.[2];
    expect(insercion.fn).toHaveBeenCalledTimes(1);
    expect(insercion.fn.mock.calls[0][1]).toBe('biometric_device_records');
    expect(insercionDatos).toEqual(
      expect.objectContaining({
        id: 'uuid-test',
        dispositivo_id: 'dev-1',
        serial: 'SERIAL1',
        rec_no: 1790715000,
        codigo_persona: '1001',
        fecha_dispositivo: '2026-09-29 21:30:00',
        metodo: 'cara',
        status: 1
      })
    );

    // La fecha sale de la zona horaria del negocio, no del reloj del servidor.
    expect(tz.fn).toHaveBeenCalledWith(new Date(1790715000 * 1000));

    expect(procesar.fn).toHaveBeenCalledWith(
      {
        codigo: '1001',
        fechaDispositivo: '2026-09-29 21:30:00',
        metodo: 'cara',
        raw: 'Events[0].UserID=1001'
      },
      { id: 'dev-1', serial: 'SERIAL1' }
    );

    expect(bitacora.info).toHaveBeenCalledWith('[biometric-live] Evento procesado', {
      serial: 'SERIAL1',
      userId: '1001',
      resultado: 'registrado'
    });
  });

  it('traduce todos los códigos de método del equipo', async () => {
    const { onEvento } = await conectar();
    const casos: Array<[number | null, string]> = [
      [0, 'clave'],
      [1, 'tarjeta'],
      [6, 'huella'],
      [15, 'cara'],
      [9, 'otro'],
      [null, 'otro']
    ];

    for (const [metodo, esperado] of casos) {
      insercion.fn.mockClear();
      await onEvento(evento({ metodo }));
      expect(insercion.fn.mock.calls[0][2].metodo).toBe(esperado);
    }
  });

  it('no filtra por status: el ASI3213A-W manda 0 cuando reconoce a la persona', async () => {
    const { onEvento } = await conectar();

    await onEvento(evento({ status: 0 }));
    await onEvento(evento({ status: 2 }));

    // Quien viene con código de persona se procesa igual; si corresponde o no
    // una asistencia lo decide procesarEventoBiometrico (misma regla que el poller).
    expect(insercion.fn).toHaveBeenCalledTimes(2);
    expect(procesar.fn).toHaveBeenCalledTimes(2);
    expect(bitacora.info).toHaveBeenCalledWith(
      '[biometric-live] Evento procesado',
      expect.objectContaining({ userId: '1001' })
    );
  });

  it('procesa los eventos sin status (equipos que no lo informan)', async () => {
    const { onEvento } = await conectar();

    await onEvento(evento({ status: null }));

    expect(insercion.fn).toHaveBeenCalledTimes(1);
    expect(procesar.fn).toHaveBeenCalledTimes(1);
  });

  it('un evento ya visto por el poller no se vuelve a procesar', async () => {
    estado.eventoYaVisto = true;
    const { onEvento } = await conectar();

    await onEvento(evento());

    expect(insercion.fn).not.toHaveBeenCalled();
    expect(procesar.fn).not.toHaveBeenCalled();
    expect(bitacora.info).not.toHaveBeenCalledWith(
      '[biometric-live] Evento procesado',
      expect.anything()
    );
  });

  it('un choque de unicidad (23505) se toma como dedupe del poller', async () => {
    const { onEvento } = await conectar();
    insercion.fn.mockRejectedValueOnce(Object.assign(new Error('duplicado'), { code: '23505' }));

    await expect(onEvento(evento())).resolves.toBeUndefined();

    expect(procesar.fn).not.toHaveBeenCalled();
  });

  it('otro error al registrar el evento se propaga', async () => {
    const { onEvento } = await conectar();
    insercion.fn.mockRejectedValueOnce(Object.assign(new Error('tabla rota'), { code: '42P01' }));

    await expect(onEvento(evento())).rejects.toMatchObject({ code: '42P01' });
  });

  it('un error al procesar no tumba el listener', async () => {
    const { onEvento } = await conectar();
    procesar.fn.mockRejectedValueOnce(new Error('regla de negocio'));

    await expect(onEvento(evento())).resolves.toBeUndefined();

    expect(bitacora.error).toHaveBeenCalledWith(
      '[biometric-live] Error procesando evento',
      expect.objectContaining({ serial: 'SERIAL1', userId: '1001' })
    );
    expect(listenersActivos()).toContain('dev-1');
  });

  it('trunca el código de persona a 64 caracteres (límite de la tabla)', async () => {
    const { onEvento } = await conectar();

    await onEvento(evento({ userId: '9'.repeat(100) }));

    expect(insercion.fn.mock.calls[0][2].codigo_persona).toBe('9'.repeat(64));
  });

  it('loguea la recepción sin exponer el código de persona', async () => {
    await conectar();

    flujo.opciones!.onChunk?.('Events[0].Code=AccessControl\r\nEvents[0].UserID=1001\r\n');

    expect(bitacora.info).toHaveBeenCalledWith('[biometric-live] Bloque recibido del equipo', {
      serial: 'SERIAL1',
      bytes: expect.any(Number)
    });
  });

  it('los keepalives sin payload no generan log de bloque', async () => {
    await conectar();

    flujo.opciones!.onChunk?.('\r\n');

    expect(bitacora.info).not.toHaveBeenCalledWith(
      '[biometric-live] Bloque recibido del equipo',
      expect.anything()
    );
  });
});

describe('ciclo de vida del supervisor', () => {
  it('no enciende si el equipo está revocado o no existe', async () => {
    estado.equipoRevocado = true;

    expect(await encenderListener('dev-1')).toBe(false);
    expect(listenersActivos()).toHaveLength(0);
    expect(flujo.conexiones).toBe(0);
  });

  it('sin credenciales se retira y limpia el listener', async () => {
    cliente.credencialesDeFila.mockReturnValue(null);

    expect(await encenderListener('dev-1')).toBe(true);
    await fluir();

    expect(listenersActivos()).toHaveLength(0);
    expect(flujo.conexiones).toBe(0);
    expect(bitacora.warn).toHaveBeenCalledWith(
      '[biometric-live] Equipo sin credenciales; listener detenido',
      { serial: 'SERIAL1' }
    );
  });

  it('si el firmware no soporta el stream, desiste y queda el poller', async () => {
    flujo.modo = 'noSoportado';

    expect(await encenderListener('dev-1')).toBe(true);
    await fluir();

    expect(listenersActivos()).toHaveLength(0);
    expect(conectadosEnVivo()).not.toContain('dev-1');
    expect(bitacora.warn).toHaveBeenCalledWith(
      '[biometric-live] Equipo sin stream en vivo; queda el poller',
      { serial: 'SERIAL1' }
    );
  });

  it('al conectar aparece en vivo y al apagarlo se desconecta', async () => {
    await conectar();
    expect(conectadosEnVivo()).toContain('dev-1');
    expect(bitacora.info).toHaveBeenCalledWith(
      '[biometric-live] Suscripción conectada (pendiente de eventos)',
      {
        serial: 'SERIAL1',
        transporte: 'CGI'
      }
    );

    apagarListener('dev-1');
    await fluir();

    expect(listenersActivos()).toHaveLength(0);
    expect(conectadosEnVivo()).not.toContain('dev-1');
  });

  it('si la fila del equipo desaparece al pedir credenciales, se retira', async () => {
    // El equipo se dio de baja entre el encendido y la carga de credenciales.
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('clave_cifrada')) return [];
      if (sql.includes('biometric_device_records')) return [];
      if (sql.includes('recoger_registros = 1')) return estado.equiposBoot;
      return [equipo];
    });

    expect(await encenderListener('dev-1')).toBe(true);
    await fluir();

    expect(listenersActivos()).toHaveLength(0);
    expect(bitacora.warn).toHaveBeenCalledWith(
      '[biometric-live] Equipo sin credenciales; listener detenido',
      { serial: 'SERIAL1' }
    );
  });

  it('apagar un listener inexistente no explota', () => {
    expect(() => apagarListener('nunca-existio')).not.toThrow();
  });

  it('encenderTodos enciende todos los equipos habilitados', async () => {
    estado.equiposBoot = [{ id: 'dev-1' }, { id: 'dev-2' }];

    await encenderTodos();
    await fluir();

    expect(listenersActivos()).toEqual(expect.arrayContaining(['dev-1', 'dev-2']));
    expect(flujo.conexiones).toBe(2);
  });
});

describe('backoff de reconexión', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('tras una caída del stream reconecta a los 5 s y vuelve a estar en vivo', async () => {
    await conectar();
    expect(conectadosEnVivo()).toContain('dev-1');

    // Stream interrumpido: el supervisor baja, espera y vuelve a conectar.
    flujo.opciones!.onError?.(new Error('el equipo cortó la conexión'));
    await fluir();

    expect(conectadosEnVivo()).not.toContain('dev-1');
    expect(flujo.conexiones).toBe(1); // aún esperando el backoff
    expect(bitacora.warn).toHaveBeenCalledWith(
      '[biometric-live] Stream interrumpido; reconectando',
      expect.objectContaining({ serial: 'SERIAL1', backoffMs: 5_000 })
    );

    await vi.advanceTimersByTimeAsync(5_000);
    await fluir();

    expect(flujo.conexiones).toBe(2);
    expect(conectadosEnVivo()).toContain('dev-1');
  });

  it('si la conexión directa falla, el backoff crece exponencialmente hasta 60 s', async () => {
    flujo.modo = 'error';

    await encenderListener('dev-1');
    await fluir();
    expect(flujo.conexiones).toBe(1);
    expect(bitacora.warn).toHaveBeenCalledWith(
      '[biometric-live] Reconectando al equipo',
      expect.objectContaining({ backoffMs: 5_000 })
    );

    await vi.advanceTimersByTimeAsync(5_000);
    await fluir();
    expect(flujo.conexiones).toBe(2);
    expect(bitacora.warn).toHaveBeenLastCalledWith(
      '[biometric-live] Reconectando al equipo',
      expect.objectContaining({ backoffMs: 10_000 })
    );

    await vi.advanceTimersByTimeAsync(10_000);
    await fluir();
    expect(flujo.conexiones).toBe(3);
    expect(bitacora.warn).toHaveBeenLastCalledWith(
      '[biometric-live] Reconectando al equipo',
      expect.objectContaining({ backoffMs: 20_000 })
    );

    await vi.advanceTimersByTimeAsync(20_000);
    await fluir();
    await vi.advanceTimersByTimeAsync(40_000);
    await fluir();
    await vi.advanceTimersByTimeAsync(60_000);
    await fluir();

    expect(flujo.conexiones).toBe(6);
    // 60 s es el tope: después de duplicar 40 s no sigue creciendo.
    expect(bitacora.warn).toHaveBeenLastCalledWith(
      '[biometric-live] Reconectando al equipo',
      expect.objectContaining({ backoffMs: 60_000 })
    );
  });
});
