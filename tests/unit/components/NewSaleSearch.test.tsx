'use client';
import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NewSaleSearch } from '@/components/sales/new/NewSaleSearch';

vi.mock('sonner', () => ({ toast: { warning: vi.fn() } }));

vi.mock('@/components/orders', () => ({
  HostessMultiSelect: () => null,
  getHostessLimit: () => 1,
  hasCommission: (producto: any) => Number(producto?.comision || 0) > 0,
  isExpensiveDrink: () => false
}));
vi.mock('@/components/shared/selects', () => ({ IndividualHostessSelect: () => null }));
// El ml por shot global sale de Configuraciones; en tests se fija para no depender del fetch.
vi.mock('@/hooks/shared/useConfigValue', () => ({
  useConfigValue: (_category: string, _key: string, defaultValue: unknown) => defaultValue
}));

import { toast } from 'sonner';

afterEach(cleanup);
beforeEach(() => vi.mocked(toast.warning).mockClear());

const conShotAnfitriona = {
  id: 'presentation-1',
  producto_id: 'product-1',
  nombre: 'Black Label 750 ml',
  categoria: 'Whisky',
  precio: 180000,
  comision: 0,
  stock_bar: 5,
  opciones_venta: [
    { tipo: 'botella', precio: 180000, comision: 0 },
    { tipo: 'shot', precio: 5000, comision: 0, precio_anfitriona: 3000 }
  ]
};

const sinShot = {
  id: 'presentation-2',
  producto_id: 'product-2',
  nombre: 'Corona 330 ml',
  categoria: 'Cerveza',
  precio: 8000,
  comision: 0,
  stock_bar: 12,
  opciones_venta: [{ tipo: 'botella', precio: 8000, comision: 0 }]
};

// La cantidad vive fuera del buscador (estado compartido con el modal de categoría), así
// que el helper la controla para reproducir el ciclo aumentar/disminuir.
const renderSearch = (
  searchResults: any[],
  {
    onAdd = vi.fn(),
    otherProductHostessSelections = {},
    cantidadesIniciales = {}
  }: {
    onAdd?: (p: any) => void;
    otherProductHostessSelections?: Record<string, string[]>;
    cantidadesIniciales?: Record<string, number>;
  } = {}
) => {
  const onCantidadChange = vi.fn();
  const Harness = () => {
    const [cantidades, setCantidades] = useState<Record<string, number>>(cantidadesIniciales);
    return (
      <NewSaleSearch
        searchProducto='black'
        setSearchProducto={vi.fn()}
        handleClearSearch={vi.fn()}
        searchLoading={false}
        searchResults={searchResults}
        anfitrionas={[]}
        champagneHostessSelections={{}}
        handleChampagneHostessChange={vi.fn()}
        hostessSearchValues={{}}
        setHostessSearchValues={vi.fn()}
        otherProductHostessSelections={otherProductHostessSelections}
        handleOtherProductHostessChange={vi.fn()}
        handleAddProducto={onAdd}
        isChampagneProduct={() => false}
        cantidades={cantidades}
        handleCantidadChange={(id, val) => {
          onCantidadChange(id, val);
          setCantidades(prev => ({ ...prev, [id]: parseInt(val) || 1 }));
        }}
      />
    );
  };
  return { onAdd, onCantidadChange, ...render(<Harness />) };
};

const celdas = () =>
  within(screen.getByRole('row', { name: /Black Label 750 ml/ })).getAllByRole('cell');

const fila = () => within(screen.getByRole('row', { name: /Black Label 750 ml/ }));

describe('buscador rápido de Nueva Venta', () => {
  it('ofrece botella, shot cliente y shot anfitriona con el precio de cada uno', () => {
    renderSearch([conShotAnfitriona]);

    expect(screen.getByRole('button', { name: 'Botella · $180.000' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Shot cliente · $5.000' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Shot anfitriona · $3.000' })).toBeInTheDocument();
    // Arranca en botella.
    expect(celdas()[1]).toHaveTextContent('$180.000');
  });

  it('marca el detalle con la audiencia del shot al agregarlo al carro', () => {
    const onAdd = vi.fn();
    renderSearch([conShotAnfitriona], { onAdd });

    fireEvent.click(screen.getByRole('button', { name: 'Shot anfitriona · $3.000' }));
    expect(celdas()[1]).toHaveTextContent('$3.000');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));

    expect(onAdd).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tipo_venta: 'shot',
        shot_anfitriona: true,
        precio: 3000,
        comision: 0
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Shot cliente · $5.000' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));

    expect(onAdd).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tipo_venta: 'shot',
        shot_anfitriona: false,
        precio: 5000
      })
    );
  });

  it('muestra la botella abierta y los shots aproximados que quedan', () => {
    renderSearch([{ ...conShotAnfitriona, ml_abierta: 620, ml_shot: null }]);

    // Sin ml_shot propio se usa el global de 50 ml.
    expect(screen.getByText('Botella abierta: 620 ml · ≈12 shots')).toBeInTheDocument();
  });

  it('calcula los shots con el ml propio de la presentación', () => {
    renderSearch([{ ...conShotAnfitriona, ml_abierta: 500, ml_shot: 40 }]);

    expect(screen.getByText('Botella abierta: 500 ml · ≈12 shots')).toBeInTheDocument();
  });

  it('sin botella abierta no muestra la línea', () => {
    renderSearch([{ ...conShotAnfitriona, ml_abierta: 0 }]);
    expect(screen.queryByText(/Botella abierta/)).not.toBeInTheDocument();
  });

  it('un producto sin el dato de botella abierta tampoco muestra la línea', () => {
    renderSearch([sinShot]);
    expect(screen.queryByText(/Botella abierta/)).not.toBeInTheDocument();
  });

  it('permite subir y bajar la cantidad antes de agregar', () => {
    const { onCantidadChange } = renderSearch([conShotAnfitriona]);

    // Arranca en una unidad y no deja bajar de ahí.
    expect(fila().getByText('1')).toBeInTheDocument();
    expect(fila().getByRole('button', { name: 'Disminuir' })).toBeDisabled();

    fireEvent.click(fila().getByRole('button', { name: 'Aumentar' }));
    expect(onCantidadChange).toHaveBeenLastCalledWith('presentation-1', '2');
    fireEvent.click(fila().getByRole('button', { name: 'Aumentar' }));
    expect(onCantidadChange).toHaveBeenLastCalledWith('presentation-1', '3');
    expect(fila().getByText('3')).toBeInTheDocument();

    fireEvent.click(fila().getByRole('button', { name: 'Disminuir' }));
    expect(onCantidadChange).toHaveBeenLastCalledWith('presentation-1', '2');
    expect(fila().getByText('2')).toBeInTheDocument();
  });

  it('muestra el stock disponible en bar junto al selector de cantidad', () => {
    renderSearch([conShotAnfitriona, sinShot]);

    // Mismo aviso que el modal de categoría, con el stock de cada presentación.
    expect(fila().getByText('Disponibles en bar: 5')).toBeInTheDocument();
    expect(
      within(screen.getByRole('row', { name: /Corona 330 ml/ })).getByText('Disponibles en bar: 12')
    ).toBeInTheDocument();
  });

  it('sin dato de stock informa cero en bar', () => {
    renderSearch([{ ...sinShot, stock_bar: undefined }]);

    expect(
      within(screen.getByRole('row', { name: /Corona 330 ml/ })).getByText('Disponibles en bar: 0')
    ).toBeInTheDocument();
  });

  it('respeta el tope de stock en botella y suelta el tope al pasar a shot', () => {
    // Black Label trae 5 botellas en bar: con 5 elegidas no se puede subir más.
    const { onCantidadChange } = renderSearch([conShotAnfitriona], {
      cantidadesIniciales: { 'presentation-1': 5 }
    });

    const aumentar = () => fila().getByRole('button', { name: 'Aumentar' });
    expect(aumentar()).toHaveAttribute('aria-disabled', 'true');

    // El shot sale de la botella abierta, no gasta botellas: su tope es otro.
    fireEvent.click(fila().getByRole('button', { name: 'Shot cliente · $5.000' }));
    expect(aumentar()).toHaveAttribute('aria-disabled', 'false');

    fireEvent.click(aumentar());
    expect(onCantidadChange).toHaveBeenLastCalledWith('presentation-1', '6');
  });

  it('avisa en bar cuando el botón de aumentar llega al tope', () => {
    const { onCantidadChange } = renderSearch([conShotAnfitriona], {
      cantidadesIniciales: { 'presentation-1': 5 }
    });

    fireEvent.click(fila().getByRole('button', { name: 'Aumentar' }));

    // Mismo aviso que el carro del dashboard ante un tope de stock.
    expect(toast.warning).toHaveBeenLastCalledWith('Stock máximo en bar: 5');
    // Y la cantidad no cambia.
    expect(onCantidadChange).not.toHaveBeenCalled();
    expect(fila().getByText('5')).toBeInTheDocument();
  });

  it('no avisa nada mientras quede margen para subir', () => {
    const { onCantidadChange } = renderSearch([conShotAnfitriona]);

    fireEvent.click(fila().getByRole('button', { name: 'Aumentar' }));

    expect(toast.warning).not.toHaveBeenCalled();
    expect(onCantidadChange).toHaveBeenLastCalledWith('presentation-1', '2');
  });

  it('no ofrece shot en un producto que no lo tiene configurado', () => {
    renderSearch([sinShot]);

    expect(screen.queryByRole('button', { name: /Shot/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar producto' })).toBeEnabled();
  });

  it('pide anfitriona antes de vender un shot con comisión', () => {
    const conComision = {
      ...conShotAnfitriona,
      opciones_venta: [
        { tipo: 'botella', precio: 180000, comision: 0 },
        { tipo: 'shot', precio: 5000, comision: 800, precio_anfitriona: 3000 }
      ]
    };
    renderSearch([conComision]);

    // La botella no cobra comisión: se puede agregar sin anfitriona.
    expect(screen.getByRole('button', { name: 'Agregar producto' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Shot anfitriona · $3.000' }));
    // El shot sí: falta asignar quién lo sirve.
    expect(screen.getByRole('button', { name: 'Agregar producto' })).toBeDisabled();
  });
});
