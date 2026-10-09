'use client';
import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NewSaleSearch } from '@/components/sales/new/NewSaleSearch';

vi.mock('sonner', () => ({ toast: { warning: vi.fn() } }));

vi.mock('@/components/orders', () => ({
  HostessMultiSelect: () => null,
  getExplicitMaxAnfitrionas: () => null,
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
  it('permite elegir cantidades independientes y agregar los tres formatos juntos', () => {
    const onAdd = vi.fn();
    renderSearch([conShotAnfitriona], { onAdd });
    const row = fila();
    fireEvent.click(row.getByRole('button', { name: 'Botella: aumentar cantidad' }));
    fireEvent.click(row.getByRole('button', { name: 'Shot cliente · 50 ml: aumentar cantidad' }));
    fireEvent.click(
      row.getByRole('button', { name: 'Shot anfitriona · 50 ml: aumentar cantidad' })
    );
    fireEvent.click(row.getByRole('button', { name: 'Agregar Black Label 750 ml' }));

    expect(onAdd).toHaveBeenCalledTimes(3);
    expect(onAdd).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ tipo_venta: 'botella', cantidad: 1, precio: 180000 })
    );
    expect(onAdd).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        tipo_venta: 'shot',
        shot_anfitriona: false,
        cantidad: 1,
        precio: 5000
      })
    );
    expect(onAdd).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        tipo_venta: 'shot',
        shot_anfitriona: true,
        cantidad: 1,
        precio: 3000
      })
    );
  });

  it('permite seguir usando la búsqueda para añadir otro producto después del primero', () => {
    const onAdd = vi.fn();
    renderSearch([conShotAnfitriona, sinShot], { onAdd });
    const ron = within(screen.getByRole('row', { name: /Black Label 750 ml/ }));
    fireEvent.click(ron.getByRole('button', { name: 'Botella: aumentar cantidad' }));
    fireEvent.click(ron.getByRole('button', { name: 'Agregar Black Label 750 ml' }));

    const cerveza = within(screen.getByRole('row', { name: /Corona 330 ml/ }));
    expect(cerveza.getByRole('button', { name: 'Agregar Corona 330 ml' })).toBeInTheDocument();
    fireEvent.click(cerveza.getByRole('button', { name: 'Botella: aumentar cantidad' }));
    fireEvent.click(cerveza.getByRole('button', { name: 'Agregar Corona 330 ml' }));
    expect(onAdd).toHaveBeenCalledTimes(2);
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

  it('muestra el stock disponible en bar junto a los formatos', () => {
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

  it('no ofrece shot en un producto que no lo tiene configurado', () => {
    renderSearch([sinShot]);

    expect(screen.queryByRole('button', { name: /Shot/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar Corona 330 ml' })).toBeDisabled();
  });

  it('agrega un shot con comisión sin anfitriona (la anfitriona es opcional)', () => {
    const conComision = {
      ...conShotAnfitriona,
      opciones_venta: [
        { tipo: 'botella', precio: 180000, comision: 0 },
        { tipo: 'shot', precio: 5000, comision: 800, precio_anfitriona: 3000 }
      ]
    };
    renderSearch([conComision]);

    expect(screen.getByRole('button', { name: 'Agregar Black Label 750 ml' })).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Shot anfitriona · 50 ml: aumentar cantidad' })
    );
    // El shot ofrece asignar anfitriona, pero no exige elegirla para vender.
    expect(screen.getByRole('button', { name: 'Agregar Black Label 750 ml' })).toBeEnabled();
  });

  it('no permite seleccionar anfitrionas para formatos sin comisión aunque el producto sea caro', () => {
    const onAdd = vi.fn();
    renderSearch([conShotAnfitriona], { onAdd });
    const row = fila();
    expect(row.getByText('Sin comisión')).toBeInTheDocument();
    fireEvent.click(row.getByRole('button', { name: 'Botella: aumentar cantidad' }));
    fireEvent.click(row.getByRole('button', { name: 'Shot cliente · 50 ml: aumentar cantidad' }));
    expect(row.getByText('Sin comisión')).toBeInTheDocument();
    fireEvent.click(row.getByRole('button', { name: 'Agregar Black Label 750 ml' }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ selectedHostesses: [] }));
  });

  it('solo habilita anfitrionas para el formato seleccionado que tiene comisión', () => {
    const producto = {
      ...conShotAnfitriona,
      opciones_venta: [
        { tipo: 'botella', precio: 180000, comision: 1000 },
        { tipo: 'shot', precio: 5000, comision: 0, precio_anfitriona: 3000 }
      ]
    };
    renderSearch([producto]);
    const row = fila();
    expect(row.getByText('Sin comisión')).toBeInTheDocument();
    fireEvent.click(row.getByRole('button', { name: 'Shot cliente · 50 ml: aumentar cantidad' }));
    expect(row.getByText('Sin comisión')).toBeInTheDocument();
    fireEvent.click(row.getByRole('button', { name: 'Botella: aumentar cantidad' }));
    expect(row.queryByText('Sin comisión')).not.toBeInTheDocument();
  });
});
