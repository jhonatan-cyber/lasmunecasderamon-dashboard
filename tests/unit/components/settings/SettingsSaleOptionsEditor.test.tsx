import { createRef } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  SettingsSaleOptionsEditor,
  type SettingsSaleOptionsHandle
} from '@/components/settings/SettingsSaleOptionsEditor';

vi.mock('@/hooks/shared/useConfigValue', () => ({ useConfigValue: () => 50 }));
afterEach(cleanup);

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
  fireEvent.change(screen.getByLabelText('Unidades por botella'), { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText('Precio corto anfitriona 2'), {
    target: { value: '7000' }
  });
  fireEvent.change(screen.getByLabelText('Ml corto cliente'), { target: { value: '60' } });
  expect(screen.queryByLabelText('Ml acompa\u00f1amiento cliente')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Ml acompa\u00f1amiento anfitriona'), {
    target: { value: '150' }
  });
  expect(ref.current!.getConfig()).toEqual({
    opciones_venta: [
      {
        tipo: 'botella',
        precio: 50000,
        comision: 5000,
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
