import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { BarStatsCards } from '@/components/bar/BarStatsCards';
import type {
  ColacionServidaHoy,
  CortoVendidoHoy,
  ShotsSummary
} from '@/modules/inventario/contracts';

afterEach(cleanup);

const resumenBase: ShotsSummary = {
  shotMl: 50,
  shotsAlerta: 3,
  mlServidosHoy: 100,
  mlColacionHoy: 40,
  shotsServidosHoy: 2,
  cortosHoy: [],
  colacionesHoy: [],
  mlRestantesTotales: 125,
  botellasAbiertas: 2,
  botellasPorAgotarse: 1
};

const corto = (extra: Partial<CortoVendidoHoy> = {}): CortoVendidoHoy => ({
  id: 'dv-1',
  venta_id: 'v-1',
  venta_codigo: 'AB12CD',
  fecha: '2026-10-20 21:14:00',
  cantidad: 2,
  precio: 3000,
  comision: 1000,
  subtotal: 6000,
  anfitriona: true,
  anfitriona_nombre: 'Nico',
  producto_id: 'p-1',
  producto_nombre: 'Whisky',
  producto_foto: null,
  presentacion_nombre: '750 ml',
  origen: 'habitacion',
  cliente_nombre: 'Juan Pérez',
  habitacion_nombre: '12',
  vendido_por: 'Cami',
  mesero_nombre: 'Sofi',
  metodo_pago: 'efectivo',
  // Volumen del trago: 50 ml (shotMl del resumen) por cada corto.
  ml: 50 * (extra.cantidad ?? 2),
  acompanamiento: null,
  ...extra
});

it('aclara cuánto del ml servido vino de colaciones', () => {
  render(<BarStatsCards resumen={resumenBase} />);

  expect(screen.getByText(/100 ml servidos \(incluye 40 ml de colaciones\)/)).toBeInTheDocument();
});

it('abre el detalle de ml disponibles por cada botella', async () => {
  render(
    <BarStatsCards
      resumen={resumenBase}
      botellasAbiertas={[
        {
          id: 'pres-1',
          venta_corto_habilitada: true,
          producto_nombre: 'Paceña',
          presentacion_nombre: '750 ml',
          cantidad: 2,
          ml_disponibles: 125,
          ml_cliente: 50,
          ml_anfitriona: 25,
          shots_anfitriona_disponibles: 5,
          shots_disponibles: 2
        }
      ]}
    />
  );

  fireEvent.click(
    screen.getByRole('button', { name: 'Ver las botellas abiertas y sus mililitros disponibles' })
  );

  expect(await screen.findByText('Paceña')).toBeInTheDocument();
  expect(within(screen.getByRole('dialog')).getByText('125 ml')).toBeInTheDocument();
  expect(screen.getByText('Cliente · 50 ml')).toBeInTheDocument();
  expect(screen.getByText('Anfitriona · 25 ml')).toBeInTheDocument();
  expect(within(screen.getByRole('dialog')).getByText('5 cortos')).toBeInTheDocument();
  expect(screen.queryByText(/LM-/)).not.toBeInTheDocument();
});

it('abre el listado de cortos servidos hoy con su origen, venta y precios', async () => {
  render(
    <BarStatsCards
      resumen={{
        ...resumenBase,
        cortosHoy: [
          corto(),
          corto({
            id: 'dv-2',
            venta_id: 'v-2',
            venta_codigo: 'ZZ99',
            fecha: '2026-10-20 20:05:00',
            cantidad: 1,
            precio: 2500,
            comision: 0,
            subtotal: 2500,
            anfitriona: false,
            anfitriona_nombre: null,
            producto_nombre: 'Ron',
            presentacion_nombre: '1 L',
            origen: 'barra',
            cliente_nombre: null,
            habitacion_nombre: null,
            mesero_nombre: null,
            metodo_pago: 'tarjeta'
          })
        ]
      }}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Ver los cortos servidos hoy y su origen' }));

  const dialogo = within(await screen.findByRole('dialog'));
  expect(dialogo.getByText('2 cortos vendidos y 40 ml de colaciones hoy.')).toBeInTheDocument();

  // Primer ticket: de anfitriona, nacido en una habitación y con comisión.
  expect(dialogo.getByText('Whisky')).toBeInTheDocument();
  expect(dialogo.getByText('Anfitriona · Nico')).toBeInTheDocument();
  expect(dialogo.getByText('Habitación 12')).toBeInTheDocument();
  expect(dialogo.getByText('Venta AB12CD · 21:14')).toBeInTheDocument();
  expect(dialogo.getByText('2 cortos · 100 ml · $6.000')).toBeInTheDocument();
  expect(dialogo.getByText('2 cortos · 100 ml · $3.000 c/u · Comisión $1.000')).toBeInTheDocument();
  expect(
    dialogo.getByText('Cliente Juan Pérez · Mesero Sofi · Registró Cami · efectivo')
  ).toBeInTheDocument();

  // Segundo ticket: cliente, venta directa de la barra y sin comisión.
  expect(dialogo.getByText('Ron')).toBeInTheDocument();
  expect(dialogo.getByText('Cliente')).toBeInTheDocument();
  expect(dialogo.getByText('Barra')).toBeInTheDocument();
  expect(dialogo.getByText('Venta ZZ99 · 20:05')).toBeInTheDocument();
  expect(dialogo.getByText('1 corto · 50 ml · $2.500')).toBeInTheDocument();
  expect(dialogo.getByText('1 corto · 50 ml · $2.500 c/u · Sin comisión')).toBeInTheDocument();
  expect(dialogo.getByText('Registró Cami · tarjeta')).toBeInTheDocument();
});

it('agrupa en un solo ticket los cortos que salieron con la misma venta', async () => {
  render(
    <BarStatsCards
      resumen={{
        ...resumenBase,
        cortosHoy: [
          // Segunda línea de la misma venta, la más reciente del ticket.
          corto({
            id: 'dv-2',
            fecha: '2026-10-20 21:16:00',
            producto_nombre: 'Ron',
            presentacion_nombre: '1 L',
            cantidad: 1,
            precio: 2500,
            comision: 0,
            subtotal: 2500,
            anfitriona: false,
            anfitriona_nombre: null
          }),
          corto()
        ]
      }}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Ver los cortos servidos hoy y su origen' }));

  const dialogo = within(await screen.findByRole('dialog'));

  // Un solo encabezado para la venta, con la hora en que arrancó y su total.
  expect(dialogo.getAllByText('Venta AB12CD · 21:14')).toHaveLength(1);
  expect(dialogo.getByText('3 cortos · 150 ml · $8.500')).toBeInTheDocument();
  expect(
    dialogo.getByText('Cliente Juan Pérez · Mesero Sofi · Registró Cami · efectivo')
  ).toBeInTheDocument();

  // Dentro del ticket, los dos cortos que salieron con esa venta.
  expect(dialogo.getByText('Whisky')).toBeInTheDocument();
  expect(dialogo.getByText('Ron')).toBeInTheDocument();
  expect(dialogo.getByText('2 cortos · 100 ml · $3.000 c/u · Comisión $1.000')).toBeInTheDocument();
  expect(dialogo.getByText('1 corto · 50 ml · $2.500 c/u · Sin comisión')).toBeInTheDocument();
});

it('resume el día en el encabezado: cobrado, anfitrionas, acompañamientos y ml', async () => {
  render(
    <BarStatsCards
      resumen={{
        ...resumenBase,
        cortosHoy: [
          // De anfitriona: 2 cortos, $6.000 y sin acompañamiento.
          corto(),
          corto({
            id: 'dv-2',
            venta_id: 'v-2',
            venta_codigo: 'ZZ99',
            cantidad: 1,
            anfitriona: false,
            anfitriona_nombre: null,
            precio: 2500,
            comision: 0,
            subtotal: 2500,
            acompanamiento: { nombre: 'Soda 500 ml', ml_por_corto: 100, unidades: null }
          })
        ]
      }}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Ver los cortos servidos hoy y su origen' }));

  const dialogo = within(await screen.findByRole('dialog'));
  expect(dialogo.getByText('Cobrado en cortos')).toBeInTheDocument();
  expect(dialogo.getByText('$8.500')).toBeInTheDocument();
  expect(dialogo.getByText('Anfitriona / Cliente')).toBeInTheDocument();
  expect(dialogo.getByText('2 / 1 cortos')).toBeInTheDocument();
  expect(dialogo.getByText('Con acompañamiento')).toBeInTheDocument();
  expect(dialogo.getByText('1 de 3 cortos')).toBeInTheDocument();
  expect(dialogo.getByText('Servido en cortos')).toBeInTheDocument();
  expect(dialogo.getByText('150 ml')).toBeInTheDocument();
});

it('dice con qué acompañamiento y cuánto se sirvió cada corto', async () => {
  render(
    <BarStatsCards
      resumen={{
        ...resumenBase,
        cortosHoy: [
          // Corto de anfitriona: la bebida entró por ml.
          corto({
            acompanamiento: { nombre: 'Soda 500 ml', ml_por_corto: 100, unidades: null }
          }),
          // Un solo corto: la bebida entró por unidad.
          corto({
            id: 'dv-2',
            venta_id: 'v-2',
            venta_codigo: 'ZZ99',
            cantidad: 1,
            producto_nombre: 'Ron',
            acompanamiento: { nombre: 'Sprite 600 ml', ml_por_corto: null, unidades: 1 }
          }),
          corto({ id: 'dv-3', venta_id: 'v-3', venta_codigo: 'QQ77' })
        ]
      }}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Ver los cortos servidos hoy y su origen' }));

  const dialogo = within(await screen.findByRole('dialog'));
  expect(
    dialogo.getByText('Acompañamiento: Soda 500 ml · 100 ml por corte (200 ml en total)')
  ).toBeInTheDocument();
  expect(
    dialogo.getByText('Acompañamiento: Sprite 600 ml · 1 unidad por corte')
  ).toBeInTheDocument();
  expect(dialogo.getByText('Sin acompañamiento')).toBeInTheDocument();
});

it('avisa cuando todavía no hay cortos servidos', async () => {
  render(<BarStatsCards resumen={resumenBase} />);

  fireEvent.click(screen.getByRole('button', { name: 'Ver los cortos servidos hoy y su origen' }));

  expect(await screen.findByText('Todavía no se vendieron cortos hoy.')).toBeInTheDocument();
  expect(screen.getByText('No hay colaciones servidas hoy.')).toBeInTheDocument();
});

it('no presenta los ml de colaciones como cortos vendidos', () => {
  render(
    <BarStatsCards
      resumen={{
        ...resumenBase,
        mlServidosHoy: 150,
        mlColacionHoy: 150,
        shotsServidosHoy: 0,
        cortosHoy: []
      }}
    />
  );

  expect(screen.getByText(/150 ml de colaciones · clic para ver detalle/)).toBeInTheDocument();
});

it('explica los ml servidos con las colaciones del turno', async () => {
  const colacion: ColacionServidaHoy = {
    id: 'col-1',
    producto_nombre: 'Coca-Cola Original',
    producto_foto: null,
    presentacion_nombre: '1500 ml',
    ml: 150,
    registrado_por: 'Jhonatan',
    fecha: '2026-10-20 11:09:00'
  };

  render(
    <BarStatsCards
      resumen={{
        ...resumenBase,
        mlServidosHoy: 150,
        mlColacionHoy: 150,
        shotsServidosHoy: 0,
        cortosHoy: [],
        colacionesHoy: [colacion]
      }}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Ver los cortos servidos hoy y su origen' }));

  expect(
    await screen.findByText('0 cortos vendidos y 150 ml de colaciones hoy.')
  ).toBeInTheDocument();
  expect(screen.getByText('Todavía no se vendieron cortos hoy.')).toBeInTheDocument();
  expect(screen.getByText('Colaciones · 150 ml')).toBeInTheDocument();
  expect(screen.getByText(/Coca-Cola Original/)).toBeInTheDocument();
  expect(screen.getByText('150 ml')).toBeInTheDocument();
  expect(screen.getByText('Registró Jhonatan · 11:09')).toBeInTheDocument();
});
