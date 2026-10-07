import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryHarness = vi.hoisted(() => {
  const queryMock = vi.fn();
  return { queryMock };
});

vi.mock('@/lib/database/db', () => ({
  generateUUID: () => 'user-1',
  query: repositoryHarness.queryMock
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-05-19 12:00:00',
  getSystemTimezone: () => 'America/Santiago'
}));

vi.mock('@/lib/business/schemas', () => ({
  UserSchema: {
    parse: (value: any) => value
  }
}));

vi.mock('@/lib/database/base-repository', () => ({
  BaseRepository: {
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findOne: vi.fn()
  }
}));

import { UserRepository } from '@/modules/identidad/usuarios/registro';

describe('listado de usuarios con varias sesiones', () => {
  it('filtra presencia con EXISTS para mantener un usuario por fila y un total correcto', async () => {
    repositoryHarness.queryMock.mockReset();
    repositoryHarness.queryMock.mockResolvedValueOnce([{ total: 1 }]).mockResolvedValueOnce([]);
    await UserRepository.getAll({ anfitrionas: '1', loggedIn: true, enLocal: true });
    for (const [sql] of repositoryHarness.queryMock.mock.calls) {
      expect(sql).toContain('EXISTS (SELECT 1 FROM logins');
      expect(sql).toContain('l.estado = 1 AND l.en_local = 1');
      expect(sql).not.toContain('INNER JOIN logins');
    }
  });
});

describe('UserRepository.getAvailableAnfitrionas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filtra solo anfitrionas logueadas y en el local', async () => {
    repositoryHarness.queryMock.mockResolvedValue([
      {
        id_usuario: 'hostess-1',
        nick: 'Ana',
        nombre: 'Ana',
        apellido: 'Perez',
        foto: 'default.png',
        estado: 1,
        estado_servicio: 0,
        telefono: '',
        email: '',
        direccion: '',
        estado_civil: '',
        afp: '',
        sueldo: 0,
        aporte: 0,
        descuento: 0,
        fecha_crea: '2026-05-19 12:00:00',
        fecha_mod: null,
        qr_token: null,
        rol_nombre: 'anfitriona',
        id_rol: 'rol-1'
      }
    ]);

    const result = await UserRepository.getAvailableAnfitrionas();

    expect(repositoryHarness.queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INNER JOIN logins l ON l.usuario_id = u.id_usuario AND l.estado = 1')
    );
    expect(repositoryHarness.queryMock).toHaveBeenCalledWith(
      expect.stringContaining('AND l.en_local = 1')
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'hostess-1',
      nick: 'Ana'
    });
  });
});
