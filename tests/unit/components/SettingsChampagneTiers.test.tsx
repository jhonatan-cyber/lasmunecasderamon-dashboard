import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SettingsChampagneTiers } from '@/components/settings/SettingsChampagneTiers';
import { createRef } from 'react';
import type { SettingsTiersHandle } from '@/components/settings/SettingsChampagneTiers';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      data: [
        { anfitrionas: 1, precio: 20000, comision: 4000 },
        { anfitrionas: 2, precio: 25000, comision: 5000 },
        { anfitrionas: 3, precio: 30000, comision: 6000 },
        { anfitrionas: 4, precio: 35000, comision: 7000 }
      ]
    })
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe('tabla controlada por el máximo de anfitrionas', () => {
  it('ajusta las filas al máximo y conserva lo editado al reducir y aumentar', async () => {
    const { rerender } = render(<SettingsChampagneTiers productId='prod' maxAnfitrionas={2} />);
    await screen.findByLabelText('Precio para 2 anfitrionas');
    expect(screen.queryByLabelText('Precio para 3 anfitrionas')).not.toBeInTheDocument();
    rerender(<SettingsChampagneTiers productId='prod' maxAnfitrionas={4} />);
    const precio = screen.getByLabelText('Precio para 4 anfitrionas');
    fireEvent.change(precio, { target: { value: '42000' } });
    rerender(<SettingsChampagneTiers productId='prod' maxAnfitrionas={2} />);
    rerender(<SettingsChampagneTiers productId='prod' maxAnfitrionas={4} />);
    expect(screen.getByLabelText('Precio para 4 anfitrionas')).toHaveValue('42.000');
  });
  it('entrega los tramos visibles al guardado general sin otro botón de guardado', async () => {
    const ref = createRef<SettingsTiersHandle>();
    render(<SettingsChampagneTiers ref={ref} productId='prod' maxAnfitrionas={2} />);
    await screen.findByLabelText('Precio para 2 anfitrionas');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(ref.current?.getTiers()).toEqual([
      { anfitrionas: 1, precio: 20000, comision: 4000 },
      { anfitrionas: 2, precio: 25000, comision: 5000 }
    ]);
  });
});
