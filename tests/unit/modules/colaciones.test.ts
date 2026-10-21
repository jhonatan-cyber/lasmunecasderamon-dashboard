import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidationError } from '@/lib/errors/errors';
import { withTransaction } from '@/lib/database/db';

// `registrarColacion` valida la entrada antes de abrir la transacción. El mock
// de `withTransaction` lanza un error reconocible para comprobar que la
// validación pasó y se alcanzó el bloque de BD; los casos inválidos deben
// rechazar antes de llamar a `withTransaction`.
vi.mock('@/lib/database/db', () => ({
  query: vi.fn(),
  withTransaction: vi.fn(async () => {
    throw new Error('REACHED_TX');
  }),
  generateUUID: () => 'col-1'
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2025-01-01 12:00:00'
}));

// El consumo de stock tiene su propia prueba (postgres/colaciones-flow): acá
// solo interesa que la validación de entrada llegue (o no) a la transacción.
vi.mock('@/modules/inventario', () => ({
  consumirColacionBar: vi.fn().mockResolvedValue(undefined)
}));

import { registrarColacion } from '@/modules/colaciones';

const valido = {
  usuarioId: 'w',
  registradoPor: 'r',
  presentacionId: 'p',
  acompanamiento: null as 'gaseosa' | 'soda' | null
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('registrarColacion (módulo colaciones)', () => {
  it('acepta la entrada completa y alcanza la transacción', async () => {
    await expect(registrarColacion(valido)).rejects.toThrow('REACHED_TX');
    expect(withTransaction).toHaveBeenCalled();
  });

  it('exige un trabajador sin abrir transacción', async () => {
    await expect(registrarColacion({ ...valido, usuarioId: '' })).rejects.toThrow(ValidationError);
    expect(withTransaction).not.toHaveBeenCalled();
  });

  it('exige una bebida sin abrir transacción', async () => {
    await expect(registrarColacion({ ...valido, presentacionId: '' })).rejects.toThrow(
      ValidationError
    );
    expect(withTransaction).not.toHaveBeenCalled();
  });

  it('rechaza un Acompañamiento inválido sin abrir transacción', async () => {
    await expect(
      registrarColacion({ ...valido, acompanamiento: 'cerveza' as 'gaseosa' })
    ).rejects.toThrow(ValidationError);
    expect(withTransaction).not.toHaveBeenCalled();
  });
});
