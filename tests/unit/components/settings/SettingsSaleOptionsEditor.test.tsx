import { createRef } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SettingsSaleOptionsEditor,
  type SettingsSaleOptionsHandle
} from '@/components/settings/SettingsSaleOptionsEditor';
import {
  ConfiguredSaleOptionsSchema,
  SaleOptionsSchema
} from '@/lib/business/schemas/sale-options';

vi.mock('@/hooks/shared/useConfigValue', () => ({ useConfigValue: () => 50 }));
afterEach(cleanup);

it('exige comisión positiva al habilitar botella con anfitriona y permite solo sin anfitriona', () => {
  const ref = createRef<SettingsSaleOptionsHandle>();
  const props = {
    ref,
    options: [{ tipo: 'botella' as const, precio: 50000, comision: 0 }],
    precio: '50000',
    onPrecio: vi.fn(),
    onComision: vi.fn(),
    saving: false
  };
  const { rerender } = render(<SettingsSaleOptionsEditor {...props} comision='' />);
  // Mismo rótulo que en la transferencia; la obligatoriedad va en el atributo.
  expect(screen.getByLabelText('Comisión')).toBeRequired();
  expect(() => ref.current!.getConfig()).toThrow(/comisión.*requerida/);
  rerender(<SettingsSaleOptionsEditor {...props} comision='0' />);
  expect(() => ref.current!.getConfig()).toThrow(/comisión.*requerida/);
  rerender(<SettingsSaleOptionsEditor {...props} comision='5000' />);
  expect(ref.current!.getConfig().opciones_venta[0].comision).toBe(5000);
  rerender(<SettingsSaleOptionsEditor {...props} precio='0' comision='' />);
  expect(screen.getByLabelText('Comisión')).not.toBeRequired();
  expect(ref.current!.getConfig().opciones_venta[0].comision).toBe(0);
});

it('con colación deshabilitada guarda cero si la cantidad queda vacía', () => {
  const ref = createRef<SettingsSaleOptionsHandle>();
  render(
    <SettingsSaleOptionsEditor
      ref={ref}
      options={[{ tipo: 'botella', precio: 50000, comision: 500 }]}
      precio='50000'
      comision='500'
      onPrecio={vi.fn()}
      onComision={vi.fn()}
      saving={false}
    />
  );
  // Settings ahora siempre ofrece el check de colación para productos clásicos.
  const colacion = screen.getByLabelText('Habilitar bebida para colación');
  expect(colacion).not.toBeChecked();
  expect(ref.current!.getConfig().opciones_venta[0].acompanamiento).toEqual({ unidades: 0 });
  const units = screen.getByLabelText('Bebida analcohólica por botella');
  fireEvent.change(units, { target: { value: '4' } });
  expect(ref.current!.getConfig().opciones_venta[0].acompanamiento).toEqual({ unidades: 4 });
  fireEvent.change(units, { target: { value: '' } });
  expect(ref.current!.getConfig().opciones_venta[0].acompanamiento).toEqual({ unidades: 0 });
});

it('guarda el precio adicional sin anfitriona y la cantidad de bebidas por botella', () => {
  const ref = createRef<SettingsSaleOptionsHandle>();
  render(
    <SettingsSaleOptionsEditor
      ref={ref}
      options={[{ tipo: 'botella', precio: 50000, comision: 5000 }]}
      precio='50.000'
      comision='5.000'
      onPrecio={vi.fn()}
      onComision={vi.fn()}
      saving={false}
    />
  );
  fireEvent.change(screen.getByLabelText('Precio de botella sin anfitriona'), {
    target: { value: '35000' }
  });
  fireEvent.change(screen.getByLabelText('Bebida analcohólica por botella'), {
    target: { value: '3' }
  });
  expect(ref.current!.getConfig().opciones_venta[0]).toMatchObject({
    tipo: 'botella',
    precio: 50000,
    comision: 5000,
    precio_sin_anfitriona: 35000,
    acompanamiento: { unidades: 3 }
  });
});

it.each(['cliente', 'anfitriona'])(
  'configura corto solo para %s sin habilitar la otra audiencia',
  audiencia => {
    const ref = createRef<SettingsSaleOptionsHandle>();
    render(
      <SettingsSaleOptionsEditor
        ref={ref}
        options={[{ tipo: 'shot', precio: 0, comision: 0 }]}
        precio='10000'
        comision=''
        onPrecio={vi.fn()}
        onComision={vi.fn()}
        saving={false}
      />
    );
    fireEvent.change(
      screen.getByLabelText(
        audiencia === 'cliente' ? 'Precio corto cliente' : 'Precio corto anfitriona'
      ),
      { target: { value: '5000' } }
    );
    const option = ref.current!.getConfig().opciones_venta[0];
    expect(option.precio).toBe(audiencia === 'cliente' ? 5000 : 0);
    expect(option.precios_anfitriona).toEqual(
      audiencia === 'anfitriona' ? [{ precio: 5000, comision: 0 }] : []
    );
  }
);

it('conserva la comisión positiva de botella incluso con precio bajo', () => {
  const ref = createRef<SettingsSaleOptionsHandle>();
  render(
    <SettingsSaleOptionsEditor
      ref={ref}
      options={[{ tipo: 'botella', precio: 10000, comision: 500 }]}
      precio='10000'
      comision='500'
      onPrecio={vi.fn()}
      onComision={vi.fn()}
      saving={false}
    />
  );
  expect(ref.current!.getConfig().opciones_venta[0].comision).toBe(500);
});

it('edita todos los precios de corto, sus ml y la bebida de botella sin perder comisiones', () => {
  const ref = createRef<SettingsSaleOptionsHandle>();
  render(
    <SettingsSaleOptionsEditor
      ref={ref}
      options={[
        {
          tipo: 'botella',
          precio: 50000,
          comision: 5000,
          acompanamiento: { tipo: 'soda', unidades: 2 }
        },
        {
          tipo: 'shot',
          precio: 3000,
          comision: 0,
          precios_anfitriona: [
            { precio: 4000, comision: 1000 },
            { precio: 6000, comision: 2000 }
          ]
        }
      ]}
      precio='50.000'
      comision='5.000'
      mlCliente={50}
      mlAnfitriona={30}
      onPrecio={vi.fn()}
      onComision={vi.fn()}
      saving={false}
    />
  );
  fireEvent.change(screen.getByLabelText('Bebida analcohólica por botella'), {
    target: { value: '3' }
  });
  fireEvent.change(screen.getByLabelText('Precio corto anfitriona 2'), {
    target: { value: '7000' }
  });
  fireEvent.change(screen.getByLabelText('Ml corto cliente'), { target: { value: '60' } });
  expect(screen.queryByLabelText('Ml bebida analcohólica cliente')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Ml bebida analcohólica anfitriona'), {
    target: { value: '150' }
  });
  expect(ref.current!.getConfig()).toEqual({
    opciones_venta: [
      {
        tipo: 'botella',
        precio: 50000,
        comision: 5000,
        colacion_habilitada: false,
        acompanamiento: { unidades: 3 }
      },
      {
        tipo: 'shot',
        precio: 3000,
        comision: 0,
        precio_anfitriona: 4000,
        ml_acompanamiento_anfitriona: 150,
        precios_anfitriona: [
          { precio: 4000, comision: 1000 },
          { precio: 7000, comision: 2000 }
        ]
      }
    ],
    ml_shot: 60,
    ml_shot_anfitriona: 30
  });
  fireEvent.change(screen.getByLabelText('Precio corto anfitriona 2'), {
    target: { value: '4000' }
  });
  expect(() => ref.current!.getConfig()).toThrow(/No repitas/);
});

describe('configuración de colación, igual que al transferir', () => {
  it('hereda los ml del corto de anfitriona cuando el producto los tiene', () => {
    const ref = createRef<SettingsSaleOptionsHandle>();
    render(
      <SettingsSaleOptionsEditor
        ref={ref}
        options={[
          { tipo: 'botella', precio: 50000, comision: 5000 },
          {
            tipo: 'shot',
            precio: 3000,
            comision: 0,
            ml_acompanamiento_anfitriona: 150,
            precios_anfitriona: [{ precio: 4000, comision: 500 }]
          }
        ]}
        precio='50.000'
        comision='5.000'
        mlCliente={50}
        mlAnfitriona={120}
        onPrecio={vi.fn()}
        onComision={vi.fn()}
        saving={false}
      />
    );
    // Sin colación no se piden ml; al habilitarla se muestran los heredados.
    expect(screen.queryByLabelText('Ml de la colación')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Habilitar bebida para colación'));
    expect(screen.getByLabelText('Colación configurada en el corto')).toBeInTheDocument();
    expect(screen.getByText('120 ml')).toBeInTheDocument();
    expect(screen.getByText('150 ml')).toBeInTheDocument();
    const config = ref.current!.getConfig();
    expect(config.opciones_venta[0]).toMatchObject({
      colacion_habilitada: true,
      ml_colacion: 120,
      acompanamiento_colacion: { unidades: 1, ml: 150 }
    });
    // Lo que guardaría settings pasa la misma validación del endpoint.
    expect(ConfiguredSaleOptionsSchema.safeParse(config.opciones_venta).success).toBe(true);
  });

  it('permite escribir los ml de la colación cuando no se heredan del corto', () => {
    const ref = createRef<SettingsSaleOptionsHandle>();
    render(
      <SettingsSaleOptionsEditor
        ref={ref}
        options={[{ tipo: 'botella', precio: 50000, comision: 5000 }]}
        precio='50.000'
        comision='5.000'
        onPrecio={vi.fn()}
        onComision={vi.fn()}
        saving={false}
      />
    );
    fireEvent.click(screen.getByLabelText('Habilitar bebida para colación'));
    expect(screen.getByLabelText('Ml de la colación')).toHaveValue('');
    expect(screen.getByText('Vacío = capacidad de la botella.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Ml de la colación'), { target: { value: '350' } });
    fireEvent.change(screen.getByLabelText('Ml de acompañamiento'), { target: { value: '150' } });
    // Las unidades del acompañamiento siguen las bebidas incluidas por botella.
    fireEvent.change(screen.getByLabelText('Bebida analcohólica por botella'), {
      target: { value: '2' }
    });
    const config = ref.current!.getConfig();
    expect(config.opciones_venta[0]).toMatchObject({
      colacion_habilitada: true,
      ml_colacion: 350,
      acompanamiento_colacion: { unidades: 2, ml: 150 }
    });
    expect(ConfiguredSaleOptionsSchema.safeParse(config.opciones_venta).success).toBe(true);
  });

  it('en bebidas analcohólicas solo pide los ml de la colación', () => {
    const ref = createRef<SettingsSaleOptionsHandle>();
    render(
      <SettingsSaleOptionsEditor
        ref={ref}
        options={[{ tipo: 'botella', precio: 10000, comision: 0 }]}
        categoria='Bebidas analcohólicas'
        precio='10000'
        comision=''
        onPrecio={vi.fn()}
        onComision={vi.fn()}
        saving={false}
      />
    );
    fireEvent.click(screen.getByLabelText('Habilitar bebida para colación'));
    expect(screen.getByLabelText('Ml de la colación')).toBeInTheDocument();
    // Sin cortos ni anfitrionas no hay acompañamiento que heredar.
    expect(screen.queryByLabelText('Ml de acompañamiento')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Ml de la colación'), { target: { value: '250' } });
    const config = ref.current!.getConfig();
    expect(config.opciones_venta[0]).toMatchObject({
      colacion_habilitada: true,
      ml_colacion: 250,
      cover_habilitado: false
    });
    // Analcohólicas validan con el esquema simple, como hace el endpoint.
    expect(SaleOptionsSchema.safeParse(config.opciones_venta).success).toBe(true);
    expect(screen.queryByLabelText('Ml de acompañamiento')).not.toBeInTheDocument();
  });
});
