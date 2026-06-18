import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryHarness = vi.hoisted(() => {
  const queryMock = vi.fn();
  return { queryMock };
});

vi.mock('@/lib/database/db', () => ({
  generateUUID: () => 'ant-1',
  withTransaction: vi.fn(async (fn: any) => fn(repositoryHarness.queryMock)),
  query: repositoryHarness.queryMock
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-04-11 12:00:00',
  getSystemTimezone: () => 'America/La_Paz'
}));

vi.mock('@/lib/business/anticiposUtils', () => ({
  getAnticipoBalances: vi.fn(async () => ({
    montoAsistencia: 0,
    montoComision: 0,
    montoPropina: 0,
    montoMaximo: 1000
  }))
}));

vi.mock('@/lib/integrations/whatsappService', () => ({
  enviarWhatsApp: vi.fn()
}));

vi.mock('@/lib/api/sseService', () => ({
  sendNotificationToAll: vi.fn()
}));

vi.mock('@/lib/integrations/pushNotifications', () => ({
  sendPushByRole: vi.fn(async () => undefined),
  sendPushNotification: vi.fn(async () => undefined)
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

vi.mock('@/lib/repositories/CashRegisterRepository', () => ({
  CashRegisterRepository: {
    getCurrentCajaId: vi.fn(async () => 'caja-1'),
    getById: vi.fn(async () => ({ monto_apertura: 500, efectivo: 500 })),
    updateBalances: vi.fn()
  }
}));

vi.mock('@/lib/repositories/BaseRepository', () => {
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockFindOne = vi.fn(async () => ({ id_anticipo: 'ant-1', estado: 0 }));
  return {
    BaseRepository: {
      insert: mockInsert,
      update: mockUpdate,
      findOne: mockFindOne
    }
  };
});

import { AnticipoRepository } from '@/lib/repositories/AnticipoRepository';
import { BaseRepository } from '@/lib/repositories/BaseRepository';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';

// ─── Shared helpers ─────────────────────────────────────────────
const USER_ROW = [{ nombre: 'Ana', apellido: 'Perez', nick: 'ana', telefono: null }];
const USER_ROW_WITH_PUSH = [
  {
    id_anticipo: 'ant-1',
    usuario_id: 'user-1',
    monto: 100,
    motivo: 'Test',
    estado: 2,
    fecha_crea: '2026-04-11 12:00:00',
    nombre: 'Ana',
    apellido: 'Perez',
    nick: 'ana',
    telefono: null,
    push_token: null
  }
];

function mockQueryImplementation(customMocks?: Record<string, any[]>) {
  repositoryHarness.queryMock.mockImplementation(async (sql: string) => {
    if (customMocks) {
      for (const [pattern, result] of Object.entries(customMocks)) {
        if (sql.includes(pattern)) return result;
      }
    }
    if (sql.includes('FROM usuarios WHERE id_usuario = ?')) return USER_ROW;
    if (sql.includes('COUNT(*) as count FROM anticipos WHERE usuario_id = ?'))
      return [{ count: 0 }];
    // Nota: el SQL real tiene saltos de linea entre 'a' y 'INNER JOIN'
    if (sql.includes('FROM anticipos a') && sql.includes('INNER JOIN usuarios')) {
      return USER_ROW_WITH_PUSH;
    }
    if (sql.includes('SELECT * FROM anticipos WHERE id_anticipo = ?')) {
      return [{ id_anticipo: 'ant-1', estado: 2 }];
    }
    return [];
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════
// updateStatus()
// ══════════════════════════════════════════════════════════════════
describe('AnticipoRepository.updateStatus', () => {
  beforeEach(() => {
    mockQueryImplementation();
  });

  it('actualiza estado y registra historial con accion "aprobado" para estado=1', async () => {
    await AnticipoRepository.updateStatus('ant-1', 1, 'admin-123');

    expect(BaseRepository.update).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipos',
      'id_anticipo',
      'ant-1',
      expect.objectContaining({ estado: 1 })
    );

    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipo_historial',
      {
        anticipo_id: 'ant-1',
        accion: 'aprobado',
        usuario_id: 'admin-123',
        fecha_crea: '2026-04-11 12:00:00'
      }
    );
  });

  it('registra historial con accion "rechazado" para estado=3', async () => {
    await AnticipoRepository.updateStatus('ant-1', 3, 'admin-123');

    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipo_historial',
      expect.objectContaining({
        accion: 'rechazado',
        usuario_id: 'admin-123'
      })
    );
  });

  it('registra historial con accion "anulado" para estado=0', async () => {
    await AnticipoRepository.updateStatus('ant-1', 0, 'admin-123');

    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipo_historial',
      expect.objectContaining({
        accion: 'anulado'
      })
    );
  });

  it('registra historial con accion generica "actualizado" para estado desconocido', async () => {
    await AnticipoRepository.updateStatus('ant-1', 99, 'admin-123');

    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipo_historial',
      expect.objectContaining({
        accion: 'actualizado'
      })
    );
  });

  it('registra historial con usuario_id undefined si no se pasa adminId', async () => {
    await AnticipoRepository.updateStatus('ant-1', 1);

    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipo_historial',
      expect.objectContaining({
        accion: 'aprobado',
        usuario_id: undefined
      })
    );
  });
});

// ══════════════════════════════════════════════════════════════════
// grant()
// ══════════════════════════════════════════════════════════════════
describe('AnticipoRepository.grant', () => {
  beforeEach(() => {
    mockQueryImplementation();
  });

  it('guarda anticipo directo como entregado para no descontar caja dos veces', async () => {
    await AnticipoRepository.grant('user-1', 100, 'Directo admin', undefined, 'admin-uuid-1');

    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipos',
      expect.objectContaining({
        id_anticipo: 'ant-1',
        usuario_id: 'user-1',
        monto: 100,
        estado: 1,
        entregado_por: 'admin-uuid-1'
      })
    );

    expect(CashRegisterRepository.updateBalances).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'caja-1',
      expect.objectContaining({ efectivo: -100, anticipo: 100 })
    );
  });

  it('inserta historial con solicitud + aprobado + entregado', async () => {
    await AnticipoRepository.grant('user-1', 100, 'Directo admin', undefined, 'admin-uuid-1');

    // solicitud
    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipo_historial',
      {
        anticipo_id: 'ant-1',
        accion: 'solicitud',
        usuario_id: 'user-1',
        fecha_crea: '2026-04-11 12:00:00'
      }
    );

    // aprobado
    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipo_historial',
      {
        anticipo_id: 'ant-1',
        accion: 'aprobado',
        usuario_id: 'admin-uuid-1',
        fecha_crea: '2026-04-11 12:00:00'
      }
    );

    // entregado
    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipo_historial',
      {
        anticipo_id: 'ant-1',
        accion: 'entregado',
        usuario_id: 'admin-uuid-1',
        fecha_crea: '2026-04-11 12:00:00'
      }
    );

    const histCalls = vi
      .mocked(BaseRepository.insert)
      .mock.calls.filter(c => c[1] === 'anticipo_historial');
    expect(histCalls).toHaveLength(3);
  });

  it('inserta historial sin usuario_id en aprobado/entregado si no se pasa adminId', async () => {
    await AnticipoRepository.grant('user-1', 100, 'Sin admin', undefined, undefined);

    // solicitud siempre tiene usuario_id del empleado
    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipo_historial',
      expect.objectContaining({
        accion: 'solicitud',
        usuario_id: 'user-1'
      })
    );

    // aprobado sin adminId → usuario_id undefined
    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipo_historial',
      expect.objectContaining({
        accion: 'aprobado',
        usuario_id: undefined
      })
    );

    // entregado sin adminId → usuario_id undefined
    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipo_historial',
      expect.objectContaining({
        accion: 'entregado',
        usuario_id: undefined
      })
    );
  });
});

// ══════════════════════════════════════════════════════════════════
// request()
// ══════════════════════════════════════════════════════════════════
describe('AnticipoRepository.request', () => {
  beforeEach(() => {
    // query() se llama varias veces: user lookup, pending count, final select
    mockQueryImplementation({
      'FROM usuarios WHERE id_usuario = ?': USER_ROW,
      'COUNT(*) as count FROM anticipos WHERE usuario_id = ?': [{ count: 0 }],
      'SELECT * FROM anticipos WHERE id_anticipo = ?': [{ id_anticipo: 'ant-1', estado: 2 }]
    });
  });

  it('inserta anticipo con estado pendiente (2)', async () => {
    await AnticipoRepository.request('user-1', 100, 'Sueldo');

    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipos',
      expect.objectContaining({
        id_anticipo: 'ant-1',
        usuario_id: 'user-1',
        monto: 100,
        estado: 2
      })
    );
  });

  it('inserta historial con accion "solicitud" y usuario_id del empleado', async () => {
    await AnticipoRepository.request('user-1', 100, 'Sueldo');

    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipo_historial',
      {
        anticipo_id: 'ant-1',
        accion: 'solicitud',
        usuario_id: 'user-1',
        fecha_crea: '2026-04-11 12:00:00'
      }
    );
  });
});

// ══════════════════════════════════════════════════════════════════
// processSolicitud()
// ══════════════════════════════════════════════════════════════════
describe('AnticipoRepository.processSolicitud', () => {
  beforeEach(() => {
    mockQueryImplementation({
      'FROM anticipos a': USER_ROW_WITH_PUSH
    });
  });

  it('aprueba solicitud y registra historial con accion "aprobado"', async () => {
    await AnticipoRepository.processSolicitud('ant-1', 'approve', 'admin-123');

    expect(BaseRepository.update).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipos',
      'id_anticipo',
      'ant-1',
      expect.objectContaining({ estado: 1, fecha_aprobacion: '2026-04-11 12:00:00' })
    );

    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipo_historial',
      {
        anticipo_id: 'ant-1',
        accion: 'aprobado',
        usuario_id: 'admin-123',
        fecha_crea: '2026-04-11 12:00:00'
      }
    );
  });

  it('rechaza solicitud y registra historial con accion "rechazado"', async () => {
    await AnticipoRepository.processSolicitud('ant-1', 'reject', 'admin-123');

    expect(BaseRepository.update).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipos',
      'id_anticipo',
      'ant-1',
      expect.objectContaining({ estado: 3 })
    );

    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipo_historial',
      {
        anticipo_id: 'ant-1',
        accion: 'rechazado',
        usuario_id: 'admin-123',
        fecha_crea: '2026-04-11 12:00:00'
      }
    );
  });

  it('inserta historial con usuario_id null si no se pasa adminId', async () => {
    await AnticipoRepository.processSolicitud('ant-1', 'approve');

    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipo_historial',
      expect.objectContaining({
        accion: 'aprobado',
        usuario_id: undefined
      })
    );
  });

  it('sincroniza el estado de la gratificación si existe una pendiente con el mismo ID', async () => {
    mockQueryImplementation({
      'FROM anticipos a': USER_ROW_WITH_PUSH,
      'SELECT estado FROM gratificaciones WHERE id = ?': [{ estado: 2 }]
    });

    await AnticipoRepository.processSolicitud('ant-1', 'approve', 'admin-123');

    expect(BaseRepository.update).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'gratificaciones',
      'id',
      'ant-1',
      expect.objectContaining({ estado: 1 })
    );
  });
});

// ══════════════════════════════════════════════════════════════════
// deliverAnticipo()
// ══════════════════════════════════════════════════════════════════
describe('AnticipoRepository.deliverAnticipo', () => {
  beforeEach(() => {
    // El anticipo ya debe estar aprobado (estado=1)
    const approvedRow = [
      {
        ...USER_ROW_WITH_PUSH[0],
        estado: 1
      }
    ];
    mockQueryImplementation({
      'FROM anticipos a': approvedRow
    });
  });

  it('entrega anticipo y registra historial con accion "entregado"', async () => {
    await AnticipoRepository.deliverAnticipo('ant-1', 'cajero-456');

    expect(BaseRepository.update).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipos',
      'id_anticipo',
      'ant-1',
      expect.objectContaining({
        entregado_por: 'cajero-456',
        fecha_entrega: '2026-04-11 12:00:00'
      })
    );

    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipo_historial',
      {
        anticipo_id: 'ant-1',
        accion: 'entregado',
        usuario_id: 'cajero-456',
        fecha_crea: '2026-04-11 12:00:00'
      }
    );
  });

  it('descuenta efectivo de caja al entregar', async () => {
    await AnticipoRepository.deliverAnticipo('ant-1', 'cajero-456');

    expect(CashRegisterRepository.updateBalances).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'caja-1',
      expect.objectContaining({ efectivo: -100, anticipo: 100 })
    );
  });
});
