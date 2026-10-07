import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GratificacionService } from '@/modules/personal/gratificaciones/servicio';

vi.mock('@/modules/personal/gratificaciones/repositorio', () => ({
  GratificacionRepository: {
    create: vi.fn(),
    request: vi.fn(),
    getAll: vi.fn(),
    getSolicitudDetalle: vi.fn(),
    processSolicitud: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

import { GratificacionRepository } from '@/modules/personal/gratificaciones/repositorio';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GratificacionService.create', () => {
  it.each([NaN, Infinity, -Infinity])(
    'rechaza montos no finitos al crear, solicitar y editar: %s',
    async monto => {
      await expect(GratificacionService.create({ usuario_id: 'user-1', monto })).rejects.toThrow(
        /positivo/
      );
      await expect(GratificacionService.request('user-1', monto)).rejects.toThrow(/positivo/);
      await expect(GratificacionService.update('g1', { monto })).rejects.toThrow(/positivo/);
      expect(GratificacionRepository.create).not.toHaveBeenCalled();
      expect(GratificacionRepository.update).not.toHaveBeenCalled();
    }
  );
  it('throws if usuario_id is empty', async () => {
    await expect(GratificacionService.create({ usuario_id: '', monto: 1000 })).rejects.toThrow(
      'Usuario es requerido'
    );
  });

  it('throws if monto is zero', async () => {
    await expect(GratificacionService.create({ usuario_id: 'user-1', monto: 0 })).rejects.toThrow(
      'Monto debe ser positivo'
    );
  });

  it('throws if monto is negative', async () => {
    await expect(
      GratificacionService.create({ usuario_id: 'user-1', monto: -500 })
    ).rejects.toThrow('Monto debe ser positivo');
  });

  it('creates gratificacion with valid data', async () => {
    vi.mocked(GratificacionRepository.create).mockResolvedValue({ id: 'gr-1' } as any);
    const result = await GratificacionService.create({
      usuario_id: 'user-1',
      monto: 5000,
      descripcion: 'Extra'
    });
    expect(GratificacionRepository.create).toHaveBeenCalledWith({
      usuario_id: 'user-1',
      monto: 5000,
      descripcion: 'Extra'
    });
    expect(result).toMatchObject({ id: 'gr-1' });
  });

  it('creates gratificacion without description', async () => {
    vi.mocked(GratificacionRepository.create).mockResolvedValue({ id: 'gr-1' } as any);
    await GratificacionService.create({ usuario_id: 'user-1', monto: 3000 });
    expect(GratificacionRepository.create).toHaveBeenCalledWith({
      usuario_id: 'user-1',
      monto: 3000
    });
  });

  it('forwards solicitante_id (quien la creó) to the repository', async () => {
    vi.mocked(GratificacionRepository.create).mockResolvedValue({ id: 'gr-1' } as any);
    await GratificacionService.create({
      usuario_id: 'user-1',
      monto: 5000,
      solicitante_id: 'admin-1'
    });
    expect(GratificacionRepository.create).toHaveBeenCalledWith({
      usuario_id: 'user-1',
      monto: 5000,
      solicitante_id: 'admin-1'
    });
  });
});

describe('GratificacionService.request', () => {
  it('throws if usuario_id is empty', async () => {
    await expect(GratificacionService.request('', 1000)).rejects.toThrow('Usuario es requerido');
  });

  it('creates gratificacion with valid params', async () => {
    vi.mocked(GratificacionRepository.create).mockResolvedValue({ id: 'gr-1' } as any);
    const result = await GratificacionService.request('user-1', 5000, 'Buen trabajo');
    expect(GratificacionRepository.create).toHaveBeenCalledWith({
      usuario_id: 'user-1',
      monto: 5000,
      descripcion: 'Buen trabajo',
      solicitante_id: null
    });
    expect(result).toMatchObject({ id: 'gr-1' });
  });

  it('persiste el cuarto argumento como solicitante_id (antes se descartaba)', async () => {
    vi.mocked(GratificacionRepository.create).mockResolvedValue({ id: 'gr-1' } as any);
    await GratificacionService.request('user-1', 5000, 'Buen trabajo', 'cajero-1');
    expect(GratificacionRepository.create).toHaveBeenCalledWith({
      usuario_id: 'user-1',
      monto: 5000,
      descripcion: 'Buen trabajo',
      solicitante_id: 'cajero-1'
    });
  });
});

describe('GratificacionService.getAll', () => {
  it('calls repository', async () => {
    vi.mocked(GratificacionRepository.getAll).mockResolvedValue([]);
    await GratificacionService.getAll('user-1');
    expect(GratificacionRepository.getAll).toHaveBeenCalledWith('user-1', undefined);
  });

  it('con solicitante arma la unión lo suyo + lo que solicitó', async () => {
    vi.mocked(GratificacionRepository.getAll).mockResolvedValue([]);
    await GratificacionService.getAll('user-1', 'user-1');
    expect(GratificacionRepository.getAll).toHaveBeenCalledWith('user-1', 'user-1');
  });
});

describe('GratificacionService.processSolicitud', () => {
  it('MCP crea una solicitud pendiente independiente y conserva al administrador solicitante', async () => {
    vi.mocked(GratificacionRepository.request).mockResolvedValue({ id: 'g1', estado: 2 } as any);
    const result = await GratificacionService.solicitarParaUsuario(
      'empleado',
      100,
      'Bono',
      'admin'
    );
    expect(GratificacionRepository.request).toHaveBeenCalledWith(
      'empleado',
      100,
      'Bono',
      'admin',
      false
    );
    expect(GratificacionRepository.create).not.toHaveBeenCalled();
    expect(result).toMatchObject({ estado: 2 });
  });
  it('calls repository with id and action', async () => {
    await GratificacionService.processSolicitud('gr-1', 'approve', 'admin-1');
    expect(GratificacionRepository.processSolicitud).toHaveBeenCalledWith(
      'gr-1',
      'approve',
      'admin-1',
      undefined
    );
  });
});

describe('GratificacionService.update', () => {
  it('calls repository with id and data', async () => {
    await GratificacionService.update('gr-1', { monto: 6000 });
    expect(GratificacionRepository.update).toHaveBeenCalledWith('gr-1', { monto: 6000 });
  });
});

describe('GratificacionService.delete', () => {
  it('calls repository with id', async () => {
    await GratificacionService.delete('gr-1');
    expect(GratificacionRepository.delete).toHaveBeenCalledWith('gr-1');
  });
});
