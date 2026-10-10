import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useTransferForm } from '@/hooks/shared/useTransferForm';
import type { BarStockItem } from '@/components/bar/transfer/transferOptions';

vi.mock('@/hooks/shared/useConfigValue', () => ({ useConfigValue: () => 50 }));

const item: BarStockItem = {
  id: 'pres-1',
  producto_id: 'prod-1',
  producto_nombre: 'Whisky',
  producto_codigo: 'W1',
  producto_foto: null,
  nombre: '750 ml',
  codigo_barras: null,
  precio_compra: 10000,
  precio_venta: 20000,
  comision: 0,
  foto: null,
  stock: 5,
  ml_shot: 75,
  ml_shot_anfitriona: 40
};

afterEach(() => vi.unstubAllGlobals());

describe('formulario de traspasos', () => {
  it('al borrar las medidas muestra los valores que realmente se guardarán', () => {
    const { result } = renderHook(() => useTransferForm({ item, open: true }));
    expect(result.current.mlPorShot).toBe(75);
    expect(result.current.mlPorShotAnfitriona).toBe(40);
    act(() => {
      result.current.setMlShotCliente('');
      result.current.setMlShotAnfitriona('');
    });
    expect(result.current.mlPorShot).toBe(50);
    expect(result.current.mlPorShotAnfitriona).toBe(50);
    act(() => result.current.setMlShotCliente('60'));
    expect(result.current.mlPorShotAnfitriona).toBe(60);
  });

  it('ignora respuestas tardías de otro producto', async () => {
    let responder!: (response: object) => void;
    const request = vi.fn().mockImplementationOnce(
      () =>
        new Promise(resolve => {
          responder = resolve;
        })
    );
    request.mockResolvedValueOnce({
      json: async () => ({ success: true, data: [{ anfitrionas: 2, precio: 8000, comision: 500 }] })
    });
    vi.stubGlobal('fetch', request);
    const champagne = { ...item, categoria_nombre: 'Champagne' };
    const { result, rerender } = renderHook(
      ({ producto }) => useTransferForm({ item: producto, open: true }),
      {
        initialProps: { producto: champagne }
      }
    );
    rerender({ producto: { ...champagne, producto_id: 'prod-2', id: 'pres-2' } });
    await waitFor(() => expect(result.current.tiers[0]?.precio).toBe('8.000'));
    await act(async () => {
      responder({
        json: async () => ({
          success: true,
          data: [{ anfitrionas: 1, precio: 1000, comision: 100 }]
        })
      });
    });
    expect(result.current.tiers[0]?.precio).toBe('8.000');
    expect(result.current.tiers[0]?.anfitrionas).toBe(2);
  });
});
