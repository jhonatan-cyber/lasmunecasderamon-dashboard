import { describe, expect, it } from 'vitest';
import { generatePrintContent, getPDFData } from '@/components/cash-register/cajaExportUtils';

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

    expect(html).toContain('Cortos a clientes (ya en ventas)');
    expect(html).toContain('Cortos a anfitrionas (ya en ventas)');
    expect(html).toContain('$10.000');
    expect(html).toContain('$6.000');
  });

  it('el PDF lista los shots justo después de las ventas de barras y renumera las filas', () => {
    const { body } = getPDFData(baseContext());
    const conceptos = body.map((fila: unknown[]) => fila[1]);

    expect(conceptos.indexOf('Cortos a clientes (ya en ventas)')).toBe(
      conceptos.indexOf('Ventas Barras') + 1
    );
    expect(conceptos.indexOf('Cortos a anfitrionas (ya en ventas)')).toBe(
      conceptos.indexOf('Cortos a clientes (ya en ventas)') + 1
    );
    // Al insertar filas nuevas la numeración tiene que seguir correlativa.
    expect(body.map((fila: unknown[]) => fila[0])).toEqual(
      body.map((_: unknown, indice: number) => String(indice + 1))
    );
  });

  it('sin shots vendidos no agrega filas al cierre', () => {
    const sinShots = baseContext({ ventasBarras: { total_venta: 25900, propinas: 900 } });

    expect(generatePrintContent(sinShots)).not.toContain('Cortos a');
    expect(getPDFData(sinShots).body.map((fila: unknown[]) => fila[1])).not.toContain(
      'Cortos a clientes (ya en ventas)'
    );
  });
});

/**
 * El cierre lista lo que salió del negocio, pero `efectivo` ya viene neto de retiros y
 * anticipos: si el listado los dejara como egresos por descontar, quien lea el PDF creería
 * que el total real los resta dos veces.
 */
describe('cajaExportUtils · egresos ya descontados', () => {
  const conEgresos = baseContext({
    caja: {
      id_caja: 'caja-1',
      monto_apertura: 10000,
      servicios: 0,
      devoluciones: 5000,
      anticipo: 60000,
      fecha_apertura: '2026-09-28 10:00:00',
      saldo_clientes_descontado: 12000
    },
    retiros: [{ monto: 40000 }]
  });

  it('marca anticipos y retiros como ya salidos del efectivo', () => {
    const html = generatePrintContent(conEgresos);

    expect(html).toContain('Anticipos (ya descontados del efectivo)');
    expect(html).toContain('Retiros (ya descontados del efectivo)');

    const conceptos = getPDFData(conEgresos).body.map((fila: unknown[]) => fila[1]);
    expect(conceptos).toContain('Anticipos (ya descontados del efectivo)');
    expect(conceptos).toContain('Retiros (ya descontados del efectivo)');
  });

  it('lista los saldos de clientes, que sí siguen por descontar', () => {
    const conceptos = getPDFData(conEgresos).body.map((fila: unknown[]) => fila[1]);

    expect(conceptos).toContain('Saldos de clientes descontados');
    // Sin saldos no aparece la fila: no hay nada que descontar.
    const sinSaldos = baseContext({ retiros: [{ monto: 40000 }] });
    expect(getPDFData(sinSaldos).body.map((fila: unknown[]) => fila[1])).not.toContain(
      'Saldos de clientes descontados'
    );
  });
});

/**
 * El cierre se imprime desde un Blob URL, que hereda el origen de quien lo crea.
 * Los nombres vienen de la base y los carga una persona en recepción, así que no
 * pueden viajar crudos al documento.
 */
describe('cajaExportUtils · escape de los datos del cierre', () => {
  it('escapa el cliente y la habitación en el listado de ventas', () => {
    const html = generatePrintContent(
      baseContext({
        activeTab: 'ventas',
        filteredVentas: [
          {
            cliente_nombre: '<script>alert(1)</script>',
            habitacion_nombre: 'Sala <b>2</b>',
            item_count: 1,
            sub_total: 1000,
            propina: 0,
            total: 1000,
            fecha_crea: '2026-09-28 10:00:00',
            metodo_pago: 'efectivo'
          }
        ]
      })
    );

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<b>2</b>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Sala &lt;b&gt;2&lt;/b&gt;');
  });

  it('escapa el cliente, las anfitrionas y la habitación en servicios', () => {
    const html = generatePrintContent(
      baseContext({
        activeTab: 'servicios',
        filteredServicios: [
          {
            cliente_nombre: '<i>Ana</i>',
            anfitrionas_nombres: 'Rosa & <b>Eva</b>',
            habitacion_nombre: '<script>x</script>',
            total_habitacion: 0,
            iva: 0,
            total: 1000,
            fecha_crea: '2026-09-28 10:00:00',
            metodo_pago: 'efectivo'
          }
        ]
      })
    );

    expect(html).not.toContain('<i>Ana</i>');
    expect(html).not.toContain('<b>Eva</b>');
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('Rosa &amp; &lt;b&gt;Eva&lt;/b&gt;');
  });

  it('escapa el motivo de un retiro', () => {
    const html = generatePrintContent(
      baseContext({
        activeTab: 'retiros',
        retiros: [
          { fecha_crea: '2026-09-28 10:00:00', motivo: '<img src=x onerror=1>', monto: 5000 }
        ]
      })
    );

    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=1&gt;');
  });

  it('escapa el método de pago mixto, que también viene de la base', () => {
    const html = generatePrintContent(
      baseContext({
        activeTab: 'ventas',
        filteredVentas: [
          {
            cliente_nombre: 'Ana',
            habitacion_nombre: 'Barra',
            item_count: 1,
            sub_total: 1000,
            propina: 0,
            total: 1000,
            fecha_crea: '2026-09-28 10:00:00',
            metodo_pago: 'mixto',
            pagos_mixtos: [{ metodo: '<b>efectivo</b>', monto: 1000 }]
          }
        ]
      })
    );

    expect(html).not.toContain('<b>efectivo</b>');
    expect(html).toContain('&lt;b&gt;efectivo&lt;/b&gt;');
  });
});
