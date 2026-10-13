import React from 'react';
import { render, cleanup, act } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ProductsPageClient } from '@/components/products/ProductsPageClient';

const state = vi.hoisted(() => ({
  reorder: vi.fn().mockResolvedValue({ success: true }),
  canEdit: true,
  dragEnd: null as null | ((event: any) => Promise<void>)
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/hooks/productos/useCategories', () => ({
  useCategories: () => ({
    filteredCategories: [
      { id: 'a', status: 1 },
      { id: 'hidden', status: 0 },
      { id: 'b', status: 1 }
    ],
    isLoading: false,
    reorderCategories: state.reorder
  })
}));
vi.mock('@/hooks/auth/useUserPermissions', () => ({
  useUserPermissions: () => ({ hasPermission: () => state.canEdit })
}));
vi.mock('@/components/auth/PermissionGuard', () => ({
  PermissionGuard: ({ children }: any) => children
}));
vi.mock('boneyard-js/react', () => ({ Skeleton: ({ children }: any) => children }));
vi.mock('@/components/products/SortableInventoryCategory', () => ({
  SortableInventoryCategory: () => null
}));
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }: any) => {
    state.dragEnd = onDragEnd;
    return children;
  },
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn()
}));
afterEach(() => {
  cleanup();
  state.reorder.mockClear();
  state.canEdit = true;
});

it('guarda el orden activo sin perder la categoría inactiva', async () => {
  render(<ProductsPageClient />);
  await act(async () => {
    await state.dragEnd!({ active: { id: 'a' }, over: { id: 'b' } });
  });
  expect(state.reorder.mock.calls[0][0].map((category: any) => category.id)).toEqual([
    'b',
    'hidden',
    'a'
  ]);
});

it('no guarda movimientos sin permiso ni cuando se suelta fuera de la lista', async () => {
  state.canEdit = false;
  render(<ProductsPageClient />);
  await act(async () => {
    await state.dragEnd!({ active: { id: 'a' }, over: { id: 'b' } });
  });
  expect(state.reorder).not.toHaveBeenCalled();
  state.canEdit = true;
  cleanup();
  render(<ProductsPageClient />);
  await act(async () => {
    await state.dragEnd!({ active: { id: 'a' }, over: null });
  });
  expect(state.reorder).not.toHaveBeenCalled();
});
