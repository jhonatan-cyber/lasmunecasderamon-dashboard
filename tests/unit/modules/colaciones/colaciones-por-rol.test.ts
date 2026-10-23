// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regla de colaciones por rol y turno de caja.
 *
 * La configuración guarda un mapa `rol_id → tope de colaciones por turno de
 * caja`. Cada trabajador del rol puede recibir hasta ese número de colaciones
 * dentro de la caja abierta del turno: sin entrada en el mapa queda la regla
 * vigente (1 por trabajador por turno) y 0 significa que el rol no recibe
 * colación.
 */

const db = vi.hoisted(() => ({ query: vi.fn(), secuencia: 0 }));
const estado = vi.hoisted(() => ({
  topeClave: '' as string | null,
  rolId: 5 as number | null,
  rolNombre: 'anfitriona' as string | null,
  recibidasEnCaja: 0,
  stockBebida: [
    {
      opciones_venta: [],
      ml_botella: 340,
      system_key: 'bebidas_analcoholicas',
      presentacion_nombre: 'lata',
      producto_nombre: 'Coca Cola'
    }
  ],
  acompanamientoEncontrado: [] as Array<{ id: string }>,
  inserts: [] as Array<{ sql: string; params: unknown[] }>
}));
const trx = vi.hoisted(() => vi.fn());

vi.mock('@/lib/database/db', () => ({
  query: db.query,
  generateUUID: () => `col-${++db.secuencia}`
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-10-22 12:00:00'
}));

vi.mock('@/modules/inventario', () => ({
  consumirColacionBar: vi.fn()
}));

vi.mock('@/lib/transaction/contract', () => ({
  enUnaUnidad: async (operacion: (unidad: unknown) => Promise<unknown>) =>
    operacion({ id: 'unidad-1' })
}));

vi.mock('@/lib/transaction/infrastructure', () => ({
  resolverTransaccion: () => trx
}));

vi.mock('@/lib/transaction/effects', () => ({
  ejecutarEfectosConfirmados: vi.fn(async (tareas: Array<() => unknown>) => {
    for (const tarea of tareas) await tarea();
  })
}));

import { registrarColacion } from '@/modules/colaciones';
import {
  excesoColacionesPorRol,
  interpretarColacionesPorRol,
  topeColacionesPorTurno
} from '@/modules/colaciones';
import { definicionDe } from '@/modules/configuracion/contracts';

const registroBase = {
  usuarioId: 'w',
  presentacionId: 'p1',
  acompanamiento: null as 'gaseosa' | 'soda' | null,
  registradoPor: 'user-1'
};

beforeEach(() => {
  vi.clearAllMocks();
  db.secuencia = 0;
  estado.topeClave = '';
  estado.rolId = 5;
  estado.rolNombre = 'anfitriona';
  estado.recibidasEnCaja = 0;
  estado.acompanamientoEncontrado = [];
  estado.inserts = [];
  db.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
    if (params.at(-1) === 'colaciones_por_rol_y_turno') return [{ valor: estado.topeClave }];
    return [];
  });
  trx.mockImplementation(async (sql: string) => {
    if (sql.includes('SELECT u.id_usuario')) {
      return [{ id_usuario: 'w', rol_id: estado.rolId, rol: estado.rolNombre }];
    }
    if (sql.includes('COUNT(*)')) return [{ total: estado.recibidasEnCaja }];
    if (sql.includes('FROM inventario_presentaciones')) return estado.stockBebida;
    if (sql.includes('INSERT INTO colaciones')) {
      estado.inserts.push({ sql, params: [] });
      return [];
    }
    if (sql.includes('FROM cajas WHERE estado = 1')) return [{ id_caja: 'caja-1' }];
    return [];
  });
});

describe('interpreting the colaciones config value', () => {
  it('un valor vacío no configura topes (queda la regla vigente)', () => {
    expect(interpretarColacionesPorRol('')).toEqual({});
    expect(interpretarColacionesPorRol(null)).toEqual({});
    expect(interpretarColacionesPorRol(undefined)).toEqual({});
  });

  it('mapea `rol_id → tope` con ids numéricos como texto', () => {
    expect(interpretarColacionesPorRol('{"5": 2, "10": 0}')).toEqual({ 5: 2, 10: 0 });
  });

  it('ignora valores inválidos en lugar de romper todo el mapa', () => {
    expect(interpretarColacionesPorRol('{"5": 2, "10": -1, "x": "tarde"}')).toEqual({ 5: 2 });
    expect(interpretarColacionesPorRol('{roto')).toEqual({});
    expect(interpretarColacionesPorRol('[1, 2]')).toEqual({});
  });
});

describe('resolving the per-turn cap', () => {
  it('un rol sin entrada en el mapa sigue la regla vigente: 1 por trabajador', () => {
    expect(topeColacionesPorTurno({}, 5)).toBe(1);
    expect(topeColacionesPorTurno({}, null)).toBe(1);
  });

  it('0 significa sin colación y los ids numéricos se emparejan con el de la fila de usuario', () => {
    expect(topeColacionesPorTurno({ 7: 0 }, 7)).toBe(0);
    expect(topeColacionesPorTurno({ 7: 3 }, '7')).toBe(3);
  });
});

describe('Detecting when a colación exceeds the cap', () => {
  it('un rol sin configurar usa el mensaje vigente', () => {
    expect(excesoColacionesPorRol({}, 5, 1)).toBe(
      'Este trabajador ya recibió su colación durante este turno de caja'
    );
  });

  it('un rol configurado dice el tope alcanzado', () => {
    const mensaje = excesoColacionesPorRol({ 5: 2 }, 5, 2);
    expect(mensaje).toContain('2');
  });

  it('0 bloquea desde cero colaciones', () => {
    expect(excesoColacionesPorRol({ 5: 0 }, 5, 0)).toBeDefined();
  });

  it('dentro del tope no hay exceso', () => {
    expect(excesoColacionesPorRol({ 5: 2 }, 5, 1)).toBeNull();
    expect(excesoColacionesPorRol({ 5: 2 }, 5, 0)).toBeNull();
  });
});

describe('the colaciones config key is registered', () => {
  it('la clave existe, es de comisiones y valida JSON rol → tope', () => {
    const definicion = definicionDe('colaciones_por_rol_y_turno');
    expect(definicion?.categoria).toBe('comisiones');
    expect(definicion?.default).toBe('');
    expect(definicion?.validar?.('{}')).toBeNull();
    expect(definicion?.validar?.('{"5": 10}')).toBeNull();
    expect(definicion?.validar?.('{"5": -1}')).toMatch(/entero/);
    expect(definicion?.validar?.('{roto')).toMatch(/JSON/);
  });
});

describe('registrar colaciones against the per-turn cap', () => {
  it('sin config un segundo registro del mismo trabajador sigue rechazado (regla vigente)', async () => {
    estado.recibidasEnCaja = 1;
    await expect(registrarColacion(registroBase)).rejects.toThrow(/ya recibió su colación/);
    expect(estado.inserts).toHaveLength(0);
  });

  it('sin config el primer registro del turno pasa', async () => {
    estado.recibidasEnCaja = 0;
    await registrarColacion(registroBase);
    expect(estado.inserts).toHaveLength(1);
  });

  it('con tope 2 permite la segunda colación del trabajador en el turno', async () => {
    estado.topeClave = '{"5": 2}';
    estado.recibidasEnCaja = 1;
    await registrarColacion(registroBase);
    expect(estado.inserts).toHaveLength(1);
  });

  it('rechaza cuando el trabajador agotó su tope del rol en el turno', async () => {
    estado.topeClave = '{"5": 2}';
    estado.recibidasEnCaja = 2;
    await expect(registrarColacion(registroBase)).rejects.toThrow(/2 colaciones/);
    expect(estado.inserts).toHaveLength(0);
  });

  it('bloquea por completo un rol configurado con 0 colaciones', async () => {
    estado.topeClave = '{"5": 0}';
    estado.recibidasEnCaja = 0;
    await expect(registrarColacion(registroBase)).rejects.toThrow(/no recibe colación/);
    expect(estado.inserts).toHaveLength(0);
  });

  it('el conteo de colaciones ya recibidas consulta por trabajador y por caja del turno', async () => {
    estado.topeClave = '{"5": 2}';
    estado.recibidasEnCaja = 0;
    await registrarColacion(registroBase);
    const llamada = trx.mock.calls.find(([sql]) => String(sql).includes('COUNT(*)'));
    expect(String(llamada?.[0])).toContain('usuario_id');
    expect(String(llamada?.[0])).toContain('caja_id');
  });

  it('una config corrupta no cambia la regla vigente (queda 1 por trabajador)', async () => {
    estado.topeClave = '{roto';
    estado.recibidasEnCaja = 1;
    await expect(registrarColacion(registroBase)).rejects.toThrow(/ya recibió su colación/);
    expect(estado.inserts).toHaveLength(0);
  });
});
