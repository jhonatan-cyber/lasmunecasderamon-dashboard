import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ProductCard from '@/components/products/ProductCard';
import ProductTable from '@/components/products/ProductTable';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Product, Presentacion } from '@/types/product';
vi.mock('@/hooks/auth/useUserPermissions', () => ({
  useUserPermissions: () => ({ hasPermission: () => true })
}));
vi.mock('@/components/products/ProductDetailsModal', () => ({ ProductDetailsModal: () => null }));
vi.mock('@/components/shared/InteractiveProductPhoto', () => ({
  InteractiveProductPhoto: ({ children }: { children: ReactNode }) => <div>{children}</div>
}));
vi.mock('@/components/shared/StaggeredEntrance', () => ({
  StaggeredEntrance: ({ children }: { children: ReactNode }) => <div>{children}</div>
}));
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
    <button onClick={onClick}>{children}</button>
  )
}));
vi.mock('@/components/shared/DeleteConfirmModal', () => ({
  DeleteConfirmModal: ({
    open,
    onConfirm,
    entityLabel,
    entityValue
  }: {
    open: boolean;
    onConfirm: () => void;
    entityLabel: string;
    entityValue: string;
  }) =>
    open ? (
      <div>
        <span>
          {entityLabel}: {entityValue}
        </span>
        <button onClick={onConfirm}>Confirmar eliminación</button>
      </div>
    ) : null
}));
afterEach(cleanup);
const product = { id: 'producto', name: 'Ron', code: 'RON', status: 1 } as Product;
const presentation = {
  id: 'pequeña',
  producto_id: 'producto',
  nombre: '750 ml',
  stock: 0
} as Presentacion;
describe('eliminación de una presentación desde el catálogo', () => {
  it.each(['tarjeta', 'tabla'])(
    '%s envía la presentación seleccionada y la identifica en la confirmación',
    view => {
      const onDelete = vi.fn();
      const props = { onEdit: vi.fn(), onDelete, onActivate: vi.fn(), onDeactivate: vi.fn() };
      if (view === 'tarjeta')
        render(
          <TooltipProvider>
            <ProductCard product={product} presentation={presentation} {...props} />
          </TooltipProvider>
        );
      else
        render(
          <ProductTable
            products={[product]}
            presentacionesPorProducto={{
              producto: [presentation, { ...presentation, id: 'grande', nombre: '1500 ml' }]
            }}
            isLoading={false}
            isMutating={false}
            currentPage={1}
            pageSize={10}
            {...props}
          />
        );
      fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
      expect(screen.getByText('presentación: Ron · 750 ml')).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación' }));
      expect(onDelete).toHaveBeenCalledWith(product, presentation);
    }
  );
});
