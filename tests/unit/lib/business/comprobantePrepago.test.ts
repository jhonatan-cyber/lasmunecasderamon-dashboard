import { describe, expect, it } from 'vitest';
import {
  calcularSaldoResultante,
  construirComprobantesDeConsumo,
  generarComprobantePrepagoHTML,
  generarComprobantesPrepagoHTML,
  type DatosComprobantePrepago
} from '@/lib/business/comprobantePrepago';

const logo = 'https://example.test/logo.png';

const consumo: DatosComprobantePrepago = {
  movimiento: 'consumo',
  titulo: 'Servicio de habitación',
  clienteNombre: 'Ana Pérez',
  clienteRun: '12.345.678-9',
  fecha: '20-11-2026 22:15',
  codigo: 'S-123',
  lineas: [{ concepto: 'Habitación Roja', detalle: '60 minutos', monto: 50000 }],
  total: 50000,
  montoPrepago: 50000,
  saldoAnterior: 70000,
  saldoResultante: 20000,
  atendidoPor: 'Carla',
  nota: 'Consumo cobrado con el saldo prepago del cliente.'
};

describe('calcularSaldoResultante', () => {
  it('descuenta el consumo sin bajar de cero', () => {
    expect(calcularSaldoResultante('consumo', 70000, 20000)).toBe(50000);
    expect(calcularSaldoResultante('consumo', 10000, 20000)).toBe(0);
  });

  it('suma el monto cuando es una carga', () => {
    expect(calcularSaldoResultante('carga', 10000, 50000)).toBe(60000);
  });
});

describe('generarComprobantePrepagoHTML', () => {
  it('muestra cliente, detalle y los tres saldos del consumo', () => {
    const html = generarComprobantePrepagoHTML(consumo, logo);

    expect(html).toContain('Comprobante de consumo');
    expect(html).toContain('Ana Pérez');
    expect(html).toContain('12.345.678-9');
    expect(html).toContain('Habitación Roja');
    expect(html).toContain('60 minutos');
    expect(html).toContain('S-123');
    expect(html).toContain('$70.000');
    expect(html).toContain('$50.000');
    expect(html).toContain('$20.000');
    expect(html).toContain('Consumido con prepago');
    expect(html).toContain('Saldo después del consumo');
    expect(html).toContain(logo);
  });

  it('separa la parte cubierta con otro medio cuando el prepago no paga todo', () => {
    const html = generarComprobantePrepagoHTML(
      { ...consumo, total: 90000, montoPrepago: 50000, saldoAnterior: 50000, saldoResultante: 0 },
      logo
    );

    expect(html).toContain('Cubierto con otro medio');
    expect(html).toContain('$40.000');
  });

  it('redacta la carga de prepago como acreditación', () => {
    const html = generarComprobantePrepagoHTML(
      {
        ...consumo,
        movimiento: 'carga',
        titulo: 'Reserva de quincho',
        montoPrepago: 50000,
        saldoAnterior: 10000,
        saldoResultante: 60000
      },
      logo
    );

    expect(html).toContain('Comprobante de prepago');
    expect(html).toContain('Acreditado al prepago');
    expect(html).toContain('Saldo después de la carga');
    expect(html).toContain('$60.000');
  });

  it('escapa los datos del cliente', () => {
    const html = generarComprobantePrepagoHTML(
      { ...consumo, clienteNombre: '<b>Ana</b> & Cía' },
      logo
    );

    expect(html).not.toContain('<b>Ana</b>');
    expect(html).toContain('&lt;b&gt;Ana&lt;/b&gt; &amp; Cía');
  });
});

describe('construirComprobantesDeConsumo', () => {
  const base = {
    movimiento: 'consumo' as const,
    titulo: 'Servicio de habitación' as const,
    fecha: '20-11-2026 22:15',
    codigo: 'S-123',
    lineas: [{ concepto: 'Habitación Roja', monto: 50000 }],
    total: 50000
  };

  const clientes = [
    { id: 'c-1', nombre: 'Ana Pérez', run: '11.111.111-1', saldo: 30000 },
    { id: 'c-2', nombre: 'Bruno Díaz', run: '22.222.222-2', saldo: 40000 }
  ];

  it('emite un comprobante por cliente con su propio saldo', () => {
    const comprobantes = construirComprobantesDeConsumo({
      base,
      clientes,
      destinos: [
        { cliente_id: 'c-1', monto: 25000 },
        { cliente_id: 'c-2', monto: 25000 }
      ]
    });

    expect(comprobantes).toHaveLength(2);
    expect(comprobantes[0]).toMatchObject({
      clienteNombre: 'Ana Pérez',
      clienteRun: '11.111.111-1',
      montoPrepago: 25000,
      saldoAnterior: 30000,
      saldoResultante: 5000
    });
    expect(comprobantes[1]).toMatchObject({
      clienteNombre: 'Bruno Díaz',
      montoPrepago: 25000,
      saldoAnterior: 40000,
      saldoResultante: 15000
    });
  });

  it('omite los destinos sin monto', () => {
    const comprobantes = construirComprobantesDeConsumo({
      base,
      clientes,
      destinos: [
        { cliente_id: 'c-1', monto: 0 },
        { cliente_id: 'c-2', monto: 10000 }
      ]
    });

    expect(comprobantes).toHaveLength(1);
    expect(comprobantes[0].clienteNombre).toBe('Bruno Díaz');
  });

  it('cae en un cliente genérico cuando no encuentra la ficha', () => {
    const [comprobante] = construirComprobantesDeConsumo({
      base,
      clientes: [],
      destinos: [{ cliente_id: 'c-9', monto: 10000 }]
    });

    expect(comprobante.clienteNombre).toBe('Cliente');
    expect(comprobante.saldoAnterior).toBe(0);
    expect(comprobante.saldoResultante).toBe(0);
  });
});

describe('generarComprobantesPrepagoHTML', () => {
  it('emite una página por cliente cuando el cobro se reparte entre dos', () => {
    const html = generarComprobantesPrepagoHTML(
      [
        { ...consumo, clienteNombre: 'Ana Pérez', montoPrepago: 25000, saldoResultante: 45000 },
        {
          ...consumo,
          clienteNombre: 'Bruno Díaz',
          montoPrepago: 25000,
          saldoAnterior: 30000,
          saldoResultante: 5000
        }
      ],
      logo
    );

    expect(html.match(/class="ticket"/g)).toHaveLength(2);
    expect(html).toContain('Ana Pérez');
    expect(html).toContain('Bruno Díaz');
    expect(html).toContain('$45.000');
    expect(html).toContain('$5.000');
  });
});
