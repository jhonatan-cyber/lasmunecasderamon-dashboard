/**
 * Casos de uso públicos del módulo Personal — horas extras.
 *
 * Fija la API pública de `modules/personal`: delegación sobre el repositorio
 * privado (mockeado acá) y validación de la entrada. La persistencia real se
 * verifica en las suites de postgres; el paso del módulo por una unidad de
 * trabajo ajena se prueba en `tests/postgres/contrato-transaccion.test.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/modules/personal/horas-extras/repositorio', () => ({
  buscarTodas: vi.fn(),
  buscarPorFechas: vi.fn(),
  insertar: vi.fn(),
  actualizar: vi.fn(),
  eliminar: vi.fn()
}));

// La API pública (`modules/personal/index.ts`) carga también anticipos, cuyo
// repositorio toca el driver; se mockea para no arrastrarlo a este entorno.
vi.mock('@/modules/personal/balances/repositorio', () => ({
  getAnticipoBalances: vi.fn(async () => ({
    montoAsistencia: 0,
    montoComision: 0,
    montoPropina: 0,
    montoMaximo: 0
  }))
}));

vi.mock('@/modules/personal/anticipos/repositorio', () => ({
  getAllAnticipos: vi.fn(),
  getAnticiposByUser: vi.fn(),
  getAnticiposByDates: vi.fn(),
  listarSolicitudesDeUsuario: vi.fn(),
  grantAnticipo: vi.fn(),
  requestAnticipo: vi.fn(),
  updateAnticipoStatus: vi.fn(),
  processSolicitudAnticipo: vi.fn(),
  deliverAnticipo: vi.fn()
}));

import {
  listarHorasExtras,
  listarHorasExtrasDeUsuario,
  listarHorasExtrasPorFechas,
  registrarHoraExtra,
  actualizarHoraExtra,
  eliminarHoraExtra
} from '@/modules/personal';
import {
  buscarTodas,
  buscarPorFechas,
  insertar,
  actualizar,
  eliminar
} from '@/modules/personal/horas-extras/repositorio';

beforeEach(() => {
  vi.clearAllMocks();
});

const entradaValida = { usuario_id: 'user-1', hora: 2, monto: 15000 };

describe('listarHorasExtras', () => {
  it('delega los filtros al repositorio', async () => {
    vi.mocked(buscarTodas).mockResolvedValue([]);
    await listarHorasExtras({ usuarioId: 'user-1', desde: '2024-01-01', hasta: '2024-01-31' });
    expect(buscarTodas).toHaveBeenCalledWith(
      { usuarioId: 'user-1', desde: '2024-01-01', hasta: '2024-01-31' },
      undefined
    );
  });

  it('lista sin filtros', async () => {
    vi.mocked(buscarTodas).mockResolvedValue([]);
    await listarHorasExtras();
    expect(buscarTodas).toHaveBeenCalledWith({}, undefined);
  });
});

describe('listarHorasExtrasDeUsuario', () => {
  it('consulta por el usuario dado', async () => {
    vi.mocked(buscarTodas).mockResolvedValue([]);
    await listarHorasExtrasDeUsuario('user-1');
    expect(buscarTodas).toHaveBeenCalledWith({ usuarioId: 'user-1' }, undefined);
  });

  it('acepta rango de fechas', async () => {
    vi.mocked(buscarTodas).mockResolvedValue([]);
    await listarHorasExtrasDeUsuario('user-1', { desde: '2024-01-01', hasta: '2024-01-31' });
    expect(buscarTodas).toHaveBeenCalledWith(
      { usuarioId: 'user-1', desde: '2024-01-01', hasta: '2024-01-31' },
      undefined
    );
  });
});

describe('listarHorasExtrasPorFechas', () => {
  it('delega usuario y fechas al repositorio', async () => {
    vi.mocked(buscarPorFechas).mockResolvedValue([]);
    const fechas = ['2024-01-01', '2024-01-02'];
    await listarHorasExtrasPorFechas('user-1', fechas);
    expect(buscarPorFechas).toHaveBeenCalledWith('user-1', fechas, undefined);
  });
});

describe('registrarHoraExtra', () => {
  it('valida la entrada y registra con los datos esperados', async () => {
    vi.mocked(insertar).mockResolvedValue({ id_hora_extra: 'ot-1' } as any);
    const resultado = await registrarHoraExtra({ ...entradaValida, device_date: '2024-01-01' });
    expect(insertar).toHaveBeenCalledWith(
      { usuario_id: 'user-1', hora: 2, monto: 15000, device_date: '2024-01-01' },
      undefined
    );
    expect(resultado).toMatchObject({ id_hora_extra: 'ot-1' });
  });

  it('rechaza un registro sin usuario', async () => {
    await expect(registrarHoraExtra({ usuario_id: '', hora: 2, monto: 100 })).rejects.toThrow(
      /Usuario es requerido/
    );
    expect(insertar).not.toHaveBeenCalled();
  });

  it('rechaza una hora inválida', async () => {
    await expect(registrarHoraExtra({ usuario_id: 'user-1', hora: 0, monto: 100 })).rejects.toThrow(
      /hora debe ser válida/
    );
    expect(insertar).not.toHaveBeenCalled();
  });
});

describe('actualizarHoraExtra', () => {
  it('valida y delega los cambios', async () => {
    vi.mocked(actualizar).mockResolvedValue(null);
    await actualizarHoraExtra('ot-1', { hora: 3, monto: 20000 });
    expect(actualizar).toHaveBeenCalledWith('ot-1', { hora: 3, monto: 20000 }, undefined);
  });

  it('rechaza un monto negativo', async () => {
    await expect(actualizarHoraExtra('ot-1', { monto: -1 })).rejects.toThrow(
      /monto no puede ser negativo/
    );
    expect(actualizar).not.toHaveBeenCalled();
  });
});

describe('eliminarHoraExtra', () => {
  it('delega al repositorio', async () => {
    vi.mocked(eliminar).mockResolvedValue(undefined);
    await eliminarHoraExtra('ot-1');
    expect(eliminar).toHaveBeenCalledWith('ot-1', undefined);
  });
});
