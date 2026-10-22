import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  botellasPorAgotarse: 1,
  mlPorProductoHoy: []
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
  // Por defecto la venta solo trae los cortos listados; los tests con botellas
  // pasan un `venta_total` mayor.
  venta_total: extra.subtotal ?? 6000,
  // Volumen del trago: 50 ml (shotMl del resumen) por cada corto.
  ml: 50 * (extra.cantidad ?? 2),
  acompanamiento: null,
  ...extra
});

it('aclara cuánto del ml servido vino de colaciones', () => {
  render(<BarStatsCards resumen={resumenBase} />);

  expect(screen.getByText(/100 ml servidos \(incluye 40 ml de colaciones\)/)).toBeInTheDocument();
});

it('muestra en la tarjeta el desglose de cortos por origen del día', () => {
  render(
    <BarStatsCards
      resumen={{
        ...resumenBase,
        shotsServidosHoy: 4,
        mlServidosHoy: 200,
        mlColacionHoy: 0,
        cortosHoy: [
          // Habitación: 2 cortos. Barra y cuenta: 1 corto cada una.
          corto(),
          corto({
            id: 'dv-2',
            venta_id: 'v-2',
            venta_codigo: 'ZZ99',
            cantidad: 1,
            origen: 'barra',
            ml: 50
          }),
          corto({
            id: 'dv-3',
            venta_id: 'v-3',
            venta_codigo: 'CC33',
            cantidad: 1,
            origen: 'cuenta',
            ml: 50
          })
        ]
      }}
    />
  );

  // El desglose se lee en la tarjeta, con el modal cerrado.
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  const desglose = within(screen.getByRole('list', { name: 'Cortos por origen' }));
  const filas = desglose.getAllByRole('listitem');
  expect(filas).toHaveLength(3);
  // Orden estable de los orígenes, no por cantidad.
  expect(filas[0]).toHaveTextContent('Barra 1');
  expect(filas[1]).toHaveTextContent('Cuenta 1');
  expect(filas[2]).toHaveTextContent('Habitación 2');
  // Los orígenes sin cortos no ensucian la tarjeta.
  expect(desglose.queryByText(/Servicio|Pedido/)).not.toBeInTheDocument();
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
  expect(dialogo.getByText('Whisky', { selector: 'p' })).toBeInTheDocument();
  expect(dialogo.getByText('Anfitriona · Nico')).toBeInTheDocument();
  expect(dialogo.getByText('Habitación 12')).toBeInTheDocument();
  expect(dialogo.getByText('Venta AB12CD · 21:14')).toBeInTheDocument();
  expect(dialogo.getByText('Total venta $6.000')).toBeInTheDocument();
  expect(dialogo.getByText('2 cortos · 100 ml')).toBeInTheDocument();
  expect(dialogo.getByText('2 cortos · 100 ml · $3.000 c/u · Comisión $1.000')).toBeInTheDocument();
  expect(
    dialogo.getByText('Cliente Juan Pérez · Mesero Sofi · Registró Cami · efectivo')
  ).toBeInTheDocument();

  // Segundo ticket: cliente, venta directa de la barra y sin comisión.
  expect(dialogo.getByText('Ron', { selector: 'p' })).toBeInTheDocument();
  expect(dialogo.getByText('Cliente')).toBeInTheDocument();
  expect(dialogo.getByText('Barra')).toBeInTheDocument();
  expect(dialogo.getByText('Venta ZZ99 · 20:05')).toBeInTheDocument();
  expect(dialogo.getByText('Total venta $2.500')).toBeInTheDocument();
  expect(dialogo.getByText('1 corto · 50 ml')).toBeInTheDocument();
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
            anfitriona_nombre: null,
            // Ambas líneas comparten el total del ticket: $8.500.
            venta_total: 8500
          }),
          corto({ venta_total: 8500 })
        ]
      }}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Ver los cortos servidos hoy y su origen' }));

  const dialogo = within(await screen.findByRole('dialog'));

  // Un solo encabezado para la venta, con la hora en que arrancó y su total.
  expect(dialogo.getAllByText('Venta AB12CD · 21:14')).toHaveLength(1);
  expect(dialogo.getByText('Total venta $8.500')).toBeInTheDocument();
  expect(dialogo.getByText('3 cortos · 150 ml')).toBeInTheDocument();
  expect(
    dialogo.getByText('Cliente Juan Pérez · Mesero Sofi · Registró Cami · efectivo')
  ).toBeInTheDocument();

  // Dentro del ticket, los dos cortos que salieron con esa venta.
  expect(dialogo.getByText('Whisky', { selector: 'p' })).toBeInTheDocument();
  expect(dialogo.getByText('Ron', { selector: 'p' })).toBeInTheDocument();
  expect(dialogo.getByText('2 cortos · 100 ml · $3.000 c/u · Comisión $1.000')).toBeInTheDocument();
  expect(dialogo.getByText('1 corto · 50 ml · $2.500 c/u · Sin comisión')).toBeInTheDocument();
});

it('muestra el total de la venta completa, con botellas, en el encabezado del ticket', async () => {
  render(
    <BarStatsCards
      resumen={{
        ...resumenBase,
        // La misma venta trajo una botella: $45.000 de ticket y $6.000 en cortos.
        cortosHoy: [corto({ venta_total: 45000 })]
      }}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Ver los cortos servidos hoy y su origen' }));

  const dialogo = within(await screen.findByRole('dialog'));
  expect(dialogo.getByText('Total venta $45.000')).toBeInTheDocument();
  expect(dialogo.getByText('2 cortos · 100 ml · $6.000 en cortos')).toBeInTheDocument();
  // El resumen del día sigue hablando solo de cortos.
  expect(dialogo.getByText('Cobrado en cortos').nextElementSibling).toHaveTextContent('$6.000');
});

it('desglosa los ml servidos del día por producto, con colaciones y acompañamientos', async () => {
  render(
    <BarStatsCards
      resumen={{
        ...resumenBase,
        shotsServidosHoy: 2,
        mlServidosHoy: 450,
        mlColacionHoy: 150,
        cortosHoy: [corto()],
        colacionesHoy: [
          {
            id: 'col-1',
            producto_nombre: 'Coca-Cola Original',
            producto_foto: null,
            presentacion_nombre: '1500 ml',
            ml: 150,
            registrado_por: 'Jhonatan',
            fecha: '2026-10-20 11:09:00'
          }
        ],
        // El servidor agrupa el día completo: cortos, acompañamientos y colaciones.
        mlPorProductoHoy: [
          { producto_id: 'p-soda', producto_nombre: 'Soda', ml: 200, ml_colacion: 0 },
          {
            producto_id: 'p-cola',
            producto_nombre: 'Coca-Cola Original',
            ml: 150,
            ml_colacion: 150
          },
          { producto_id: 'p-1', producto_nombre: 'Whisky', ml: 100, ml_colacion: 0 }
        ]
      }}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Ver los cortos servidos hoy y su origen' }));

  const dialogo = within(await screen.findByRole('dialog'));
  const desglose = within(dialogo.getByRole('list', { name: 'Ml servidos hoy por producto' }));
  const filas = desglose.getAllByRole('listitem');
  expect(filas).toHaveLength(3);

  // Orden del servidor: de mayor a menor ml.
  expect(filas[0]).toHaveTextContent('Soda');
  expect(filas[0]).toHaveTextContent('200 ml');
  expect(filas[1]).toHaveTextContent('Coca-Cola Original');
  expect(filas[1]).toHaveTextContent('150 ml');
  // La fila que incluye colación se distingue del resto.
  expect(filas[1]).toHaveTextContent('Colación');
  expect(filas[2]).toHaveTextContent('Whisky');
  expect(filas[2]).toHaveTextContent('100 ml');

  // El total y el alcance explican los ml servidos del día.
  expect(dialogo.getByText('Total 450 ml')).toBeInTheDocument();
  expect(dialogo.getByText('Incluye cortos, acompañamientos y colaciones.')).toBeInTheDocument();
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

it('filtra los cortos del modal por origen', async () => {
  render(
    <BarStatsCards
      resumen={{
        ...resumenBase,
        cortosHoy: [
          // Habitación: 2 cortos de anfitriona por $6.000.
          corto(),
          // Barra: 1 corto de cliente, con acompañamiento por unidad.
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
            metodo_pago: 'tarjeta',
            ml: 50,
            acompanamiento: { nombre: 'Coca-Cola', ml_por_corto: null, unidades: 1 }
          }),
          // Cuenta: 1 corto de cliente por $3.000.
          corto({
            id: 'dv-3',
            venta_id: 'v-3',
            venta_codigo: 'CC33',
            fecha: '2026-10-20 19:40:00',
            cantidad: 1,
            precio: 3000,
            comision: 0,
            subtotal: 3000,
            anfitriona: false,
            anfitriona_nombre: null,
            producto_nombre: 'Tequila',
            presentacion_nombre: '700 ml',
            origen: 'cuenta',
            cliente_nombre: 'Ana',
            habitacion_nombre: null,
            mesero_nombre: null,
            metodo_pago: 'cuenta abierta',
            ml: 50,
            acompanamiento: null
          })
        ],
        colacionesHoy: [
          {
            id: 'col-1',
            producto_nombre: 'Coca-Cola Original',
            producto_foto: null,
            presentacion_nombre: '1500 ml',
            ml: 40,
            registrado_por: 'Jhonatan',
            fecha: '2026-10-20 11:09:00'
          }
        ]
      }}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Ver los cortos servidos hoy y su origen' }));

  const dialogo = within(await screen.findByRole('dialog'));
  const filtros = within(dialogo.getByRole('group', { name: 'Filtrar cortos por origen' }));
  expect(filtros.getByRole('button', { name: 'Todos · 4' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(filtros.getByRole('button', { name: 'Barra · 1' })).toBeEnabled();
  expect(filtros.getByRole('button', { name: 'Cuenta · 1' })).toBeEnabled();
  expect(filtros.getByRole('button', { name: 'Habitación · 2' })).toBeEnabled();
  // Los orígenes sin cortos del día no se pueden elegir.
  expect(filtros.getByRole('button', { name: 'Servicio · 0' })).toBeDisabled();
  expect(filtros.getByRole('button', { name: 'Pedido · 0' })).toBeDisabled();

  fireEvent.click(filtros.getByRole('button', { name: 'Habitación · 2' }));

  // Solo el ticket de la habitación y un resumen recalculado sobre él.
  expect(dialogo.getByText('Whisky', { selector: 'p' })).toBeInTheDocument();
  expect(dialogo.queryByText('Ron')).not.toBeInTheDocument();
  expect(dialogo.queryByText('Tequila')).not.toBeInTheDocument();
  expect(dialogo.getByText('Resumen · Habitación')).toBeInTheDocument();
  expect(dialogo.getByText('Cobrado en cortos').nextElementSibling).toHaveTextContent('$6.000');
  expect(dialogo.getByText('Anfitriona / Cliente').nextElementSibling).toHaveTextContent(
    '2 / 0 cortos'
  );
  expect(dialogo.getByText('Con acompañamiento').nextElementSibling).toHaveTextContent(
    '0 de 2 cortos'
  );
  expect(dialogo.getByText('Servido en cortos').nextElementSibling).toHaveTextContent('100 ml');
  expect(dialogo.getByText('Habitación · 2 cortos de 4 vendidos hoy.')).toBeInTheDocument();
  expect(dialogo.getByText('Cortos vendidos · Habitación')).toBeInTheDocument();
  // Las colaciones no tienen origen: no se mezclan con el filtro.
  expect(dialogo.queryByText('Colaciones · 40 ml')).not.toBeInTheDocument();

  fireEvent.click(filtros.getByRole('button', { name: 'Todos · 4' }));

  expect(dialogo.getByText('Ron', { selector: 'p' })).toBeInTheDocument();
  expect(dialogo.getByText('Tequila', { selector: 'p' })).toBeInTheDocument();
  expect(dialogo.getByText('Resumen del día')).toBeInTheDocument();
  expect(dialogo.getByText('Cobrado en cortos').nextElementSibling).toHaveTextContent('$11.500');
  expect(dialogo.getByText('Colaciones · 40 ml')).toBeInTheDocument();
});

it('vuelve al día completo cuando el origen filtrado ya no tiene cortos', async () => {
  const { rerender } = render(
    <BarStatsCards
      resumen={{
        ...resumenBase,
        cortosHoy: [
          corto(),
          corto({
            id: 'dv-2',
            venta_id: 'v-2',
            venta_codigo: 'ZZ99',
            cantidad: 1,
            precio: 2500,
            comision: 0,
            subtotal: 2500,
            anfitriona: false,
            anfitriona_nombre: null,
            producto_nombre: 'Ron',
            origen: 'barra',
            ml: 50
          })
        ]
      }}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Ver los cortos servidos hoy y su origen' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Barra · 1' }));
  expect(within(screen.getByRole('dialog')).getByText('Resumen · Barra')).toBeInTheDocument();

  // El resumen se refresca y la barra ya no tiene cortos: el modal no queda vacío.
  rerender(<BarStatsCards resumen={{ ...resumenBase, cortosHoy: [corto()] }} />);

  const dialogo = within(screen.getByRole('dialog'));
  expect(dialogo.getByText('Resumen del día')).toBeInTheDocument();
  expect(dialogo.getByRole('button', { name: 'Todos · 2' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(dialogo.getByText('Whisky', { selector: 'p' })).toBeInTheDocument();
});

it('vuelve a Todos al cerrar y reabrir el detalle de cortos', async () => {
  render(
    <BarStatsCards
      resumen={{
        ...resumenBase,
        cortosHoy: [
          corto(),
          corto({ id: 'dv-2', venta_id: 'v-2', cantidad: 1, origen: 'barra', ml: 50 })
        ]
      }}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Ver los cortos servidos hoy y su origen' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Barra · 1' }));
  expect(within(screen.getByRole('dialog')).getByText('Resumen · Barra')).toBeInTheDocument();

  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

  fireEvent.click(screen.getByRole('button', { name: 'Ver los cortos servidos hoy y su origen' }));

  const dialogo = within(await screen.findByRole('dialog'));
  expect(dialogo.getByRole('button', { name: 'Todos · 3' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(dialogo.getByText('Resumen del día')).toBeInTheDocument();
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
