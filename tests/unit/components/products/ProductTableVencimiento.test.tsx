import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProductTable from '@/components/products/ProductTable';
import type { Product } from '@/types/product';

vi.mock('@/hooks/auth/useUserPermissions', () => ({
  useUserPermissions: () => ({ hasPermission: () => false })
}));

// El modal de detalles se monta siempre (cerrado) y arrastra AuthContext;
// acá solo interesa la fila del listado.
vi.mock('@/components/products/ProductDetailsModal', () => ({
  ProductDetailsModal: () => null
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => children,
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => [])
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => children,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
  arrayMove: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false
  })
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => undefined } }
}));

// Hoy fijo: 2026-10-23 en la zona del negocio (America/Santiago).
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-23T15:00:00.000Z'));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const producto = (overrides: Partial<Product> = {}): Product => ({
  id: 'p-1',
  code: 'P001',
  name: 'Ron Habana',
  category_id: '1',
  price: 9990,
  commission: 0,
  description: '',
  status: 1,
  stock_almacen: 5,
  ...overrides
});

const mount = (products: Product[]) =>
  render(
    <ProductTable
      products={products}
      onEdit={() => {}}
      onDelete={() => {}}
      onActivate={() => {}}
      onDeactivate={() => {}}
      isLoading={false}
      isMutating={false}
      currentPage={1}
      pageSize={5}
    />
  );

describe('ProductTable · vencimiento', () => {
  it('muestra la columna y marca el lote vencido', () => {
    mount([producto({ fecha_vencimiento: '2026-10-20' })]);

    expect(screen.getByRole('columnheader', { name: 'Vencimiento' })).toBeInTheDocument();
    expect(screen.getByText('20-10-2026')).toBeInTheDocument();
    expect(screen.getByText('Vencido')).toBeInTheDocument();
  });

  it('marca el lote por vencer', () => {
    mount([producto({ fecha_vencimiento: '2026-11-02' })]);

    expect(screen.getByText('Vence en 10 d')).toBeInTheDocument();
  });

  it('deja solo la fecha cuando el lote todavía está vigente', () => {
    mount([producto({ fecha_vencimiento: '2027-06-30' })]);

    expect(screen.getByText('30-06-2027')).toBeInTheDocument();
    expect(screen.queryByText(/Vence en/)).not.toBeInTheDocument();
    expect(screen.queryByText('Vencido')).not.toBeInTheDocument();
  });

  it('muestra un guion cuando el producto no tiene fecha', () => {
    mount([producto()]);

    expect(screen.queryByText('Vencido')).not.toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
