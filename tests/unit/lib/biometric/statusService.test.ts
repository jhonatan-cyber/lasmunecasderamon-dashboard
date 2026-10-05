// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests del panel de estado biométrico:
 *   - asistencias de hoy filtradas por origen = 'biometrico',
 *   - ventana horaria leída de configuraciones,
 *   - estado por lector con su switch,
 *   - y que el flujo del lector marca origen='biometrico' en el insert.
 */

const db = vi.hoisted(() => ({ queryMock: vi.fn() }));
const sse = vi.hoisted(() => ({ enviar: vi.fn() }));
const live = vi.hoisted(() => ({ activos: vi.fn(() => []), conectados: vi.fn(() => []) }));
const poller = vi.hoisted(() => ({ corriendo: vi.fn(() => false) }));
// El flujo real dispara el aviso sonoro (Talk): acá se mockea para que el test
// no intente abrir sesión contra ningún equipo.
const avisos = vi.hoisted(() => ({ resultado: vi.fn(), enrolamiento: vi.fn() }));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'uuid-test',
  withTransaction: vi.fn()
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getSystemTimezone: () => 'America/Santiago',
  getNowInBusinessTimezone: () => '2026-09-29 22:15:00'
}));

vi.mock('@/modules/asistencia/marcas/repositorio', () => ({
  getAttendanceConfigHours: async () => ({ startHour: 21, endHour: 23 })
}));

vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: sse.enviar }));

vi.mock('@/modules/asistencia/biometrico/eventListener', () => ({
  listenersActivos: live.activos,
  conectadosEnVivo: live.conectados
}));

vi.mock('@/modules/asistencia/biometrico/recordPoller', () => ({
  estaCorriendo: poller.corriendo
}));

vi.mock('@/modules/asistencia/biometrico/avisosAudio', () => ({
  avisarResultadoEnEquipo: avisos.resultado,
  avisarEnrolamientoEnEquipo: avisos.enrolamiento
}));

import { obtenerEstadoBiometrico } from '@/modules/asistencia/biometrico/statusService';
import { procesarEventoBiometrico } from '@/modules/asistencia/biometrico/processBiometricEvent';

function instalarEstado(
  desfaseRows: { serial: string; desfase_promedio: number; muestras: number }[] = []
) {
  db.queryMock.mockImplementation(async (sql: string) => {
    if (sql.includes("origen = 'biometrico'")) {
      return [
        { nombre_completo: 'Ana Perez', hora: '21:32:00' },
        { nombre_completo: 'Beto Ruiz', hora: '21:40:00' },
        { nombre_completo: 'Cati Soto', hora: '21:58:00' }
      ];
    }
    if (sql.includes('FROM configuraciones')) {
      return [
        { clave: 'asistencia_hora_inicio', valor: '20' },
        { clave: 'asistencia_hora_fin', valor: '23' }
      ];
    }
    if (sql.includes('fecha_recepcion - fecha_dispositivo')) return desfaseRows;
    if (sql.includes('FROM biometric_devices')) {
      return [
        {
          id: 'dev-1',
          nombre: 'Puerta principal',
          marca: 'dahua',
          serial: 'S1',
          ip: '192.168.1.50',
          recoger_registros: 1,
          ultimo_uso: '2026-09-29 21:58:00'
        },
        {
          id: 'dev-2',
          nombre: 'Viejo',
          marca: 'zkteco',
          serial: 'S2',
          ip: null,
          recoger_registros: 0,
          ultimo_uso: null
        }
      ];
    }
    return [];
  });
}

beforeEach(() => {
  db.queryMock.mockReset();
});

describe('obtenerEstadoBiometrico', () => {
  it('cuenta las asistencias de hoy SOLO del lector y lista las personas', async () => {
    instalarEstado();

    const estado = await obtenerEstadoBiometrico();

    expect(estado.asistenciasBiometricasHoy).toBe(3);
    expect(estado.asistencias.map(a => a.usuario)).toEqual(['Ana Perez', 'Beto Ruiz', 'Cati Soto']);
    // La consulta filtra por origen y fecha de hoy (hora de negocio).
    const consulta = db.queryMock.mock.calls.find(call =>
      String(call[0]).includes("origen = 'biometrico'")
    );
    expect(consulta?.[1]).toContain('2026-09-29');
  });

  it('lee la ventana horaria configurada', async () => {
    instalarEstado();

    const estado = await obtenerEstadoBiometrico();

    expect(estado.ventana).toEqual({ inicio: 20, fin: 23 });
  });

  it('estado por lector: switch y último evento', async () => {
    instalarEstado();

    const estado = await obtenerEstadoBiometrico();

    expect(estado.lectores).toHaveLength(2);
    const activo = estado.lectores.find(l => l.id === 'dev-1');
    expect(activo?.habilitado).toBe(true);
    expect(activo?.ultimo_evento).toBe('2026-09-29 21:58:00');
    const apagado = estado.lectores.find(l => l.id === 'dev-2');
    expect(apagado?.habilitado).toBe(false);
  });

  it('expone si la red de seguridad está corriendo', async () => {
    instalarEstado();
    poller.corriendo.mockReturnValue(true);

    const estado = await obtenerEstadoBiometrico();

    expect(estado.pollerActivo).toBe(true);
  });

  it('expone el desfase del reloj del lector desde la auditoría (24 h)', async () => {
    // El serial S1 manda eventos con 95 s promedio de atraso; el S2 no manda.
    instalarEstado([{ serial: 'S1', desfase_promedio: 95.4, muestras: 12 }]);

    const estado = await obtenerEstadoBiometrico();

    const lector = estado.lectores.find(l => l.id === 'dev-1');
    expect(lector?.desfase).toEqual({ segundos: 95, muestras: 12 });
    // El lector sin eventos en 24 h no trae desfase (null = sin datos).
    const sinDatos = estado.lectores.find(l => l.id === 'dev-2');
    expect(sinDatos?.desfase).toBeNull();
  });

  it('la consulta del desfase acota a 24 h y agrupa por serial', async () => {
    instalarEstado();

    await obtenerEstadoBiometrico();

    const consulta = db.queryMock.mock.calls.find(call =>
      String(call[0]).includes('fecha_recepcion - fecha_dispositivo')
    );
    expect(String(consulta?.[0])).toContain("interval '24 hours'");
    expect(String(consulta?.[0])).toContain('GROUP BY serial');
  });
});

describe('marca de origen en el flujo del lector', () => {
  it('procesarEventoBiometrico inserta la asistencia con origen=biometrico', async () => {
    db.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM usuarios')) {
        return [{ id_usuario: 'u-1', nombre: 'Ana', apellido: 'Perez', estado: 1 }];
      }
      if (sql.includes('FROM asistencias')) return [];
      return [];
    });

    await procesarEventoBiometrico(
      {
        codigo: '1001',
        fechaDispositivo: '2026-09-29 21:30:00',
        metodo: 'cara',
        raw: 'raw'
      },
      { id: 'dev-1', serial: 'S1' }
    );

    const insert = db.queryMock.mock.calls.find(call =>
      String(call[0]).includes('INSERT INTO asistencias')
    );
    expect(insert).toBeTruthy();
    expect(insert?.[1]).toContain('biometrico');
  });
});
