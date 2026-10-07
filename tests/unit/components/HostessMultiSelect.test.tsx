import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import HostessMultiSelect from '@/components/orders/HostessMultiSelect';
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => children,
  PopoverContent: ({ children }: any) => <div>{children}</div>
}));
afterEach(cleanup);
describe('anfitrionas únicas en el selector', () => {
  it('muestra una opción y una etiqueta por persona aunque se repita en los datos', () => {
    render(
      <HostessMultiSelect
        anfitrionas={[
          { id: 'anf-1', nick: 'Ana' },
          { id_usuario: 'anf-1', nick: 'Ana' }
        ]}
        value={['anf-1']}
        onChange={vi.fn()}
        searchValue=''
        onSearchChange={vi.fn()}
      />
    );
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.getAllByText('Ana')).toHaveLength(2);
  });
});
