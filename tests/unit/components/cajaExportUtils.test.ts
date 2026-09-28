import { describe, expect, it } from 'vitest';
import { generatePrintContent, getPDFData } from '@/components/caja/cajaExportUtils';

const baseContext = (overrides: Record<string, unknown> = {}) =>
  ({
    caja: {
      id_caja: 'caja-1',
      monto_apertura: 10000,
      servicios: 0,
      devoluciones: 0,
      anticipo: 0,
      fecha_apertura: '2026-09-28 10:00:00'
    },
    activeTab: 'resumen',
    estadoInfo: { label: 'En curso' },
    filteredVentas: [],
    filteredServicios: [],
    retiros: [],
    ventasTragosChicas: { total_venta: 0, propinas: 0, cargo_tarjeta: 0 },
    ventasChampagne: { total_venta: 0, propinas: 0, cargo_tarjeta: 0 },
    ventasBarras: {
      total_venta: 25900,
      propinas: 900,
      cargo_tarjeta: 0,
      shots_cliente: { monto: 10000, cantidad: 2 },
      shots_anfitriona: { monto: 6000, cantidad: 2 }
    },
    prepagoCargado: 0,
    prepagoConsumido: 0,
    ingresosReales: 0,
    efectivoNeto: 0,
    tarjetaCaja: 0,
    transferenciaCaja: 0,
    totalMetodosPago: 0,
    totalReal: 0,
    distribucionDinero: [],
    ...overrides
  }) as any;

describe('cajaExportUtils · shots del cierre', () => {
  it('el resumen imprimible separa los shots de cliente y de anfitriona', () => {
    const html = generatePrintContent(baseContext());

    expect(html).toContain('Shots a clientes (ya en ventas)');
    expect(html).toContain('Shots a anfitrionas (ya en ventas)');
    expect(html).toContain('$10.000');
    expect(html).toContain('$6.000');
  });

  it('el PDF lista los shots justo después de las ventas de barras y renumera las filas', () => {
    const { body } = getPDFData(baseContext());
    const conceptos = body.map((fila: unknown[]) => fila[1]);

    expect(conceptos.indexOf('Shots a clientes (ya en ventas)')).toBe(
      conceptos.indexOf('Ventas Barras') + 1
    );
    expect(conceptos.indexOf('Shots a anfitrionas (ya en ventas)')).toBe(
      conceptos.indexOf('Shots a clientes (ya en ventas)') + 1
    );
    // Al insertar filas nuevas la numeración tiene que seguir correlativa.
    expect(body.map((fila: unknown[]) => fila[0])).toEqual(
      body.map((_: unknown, indice: number) => String(indice + 1))
    );
  });

  it('sin shots vendidos no agrega filas al cierre', () => {
    const sinShots = baseContext({ ventasBarras: { total_venta: 25900, propinas: 900 } });

    expect(generatePrintContent(sinShots)).not.toContain('Shots a');
    expect(getPDFData(sinShots).body.map((fila: unknown[]) => fila[1])).not.toContain(
      'Shots a clientes (ya en ventas)'
    );
  });
});
