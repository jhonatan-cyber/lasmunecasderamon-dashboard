import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculatePagination, filterVentas, formatCurrency, getVentaDetails, solicitarAnulacionVenta, sortVentas } from '@/lib/business/salesUtils';
afterEach(() => vi.unstubAllGlobals());
describe('consultas de ventas en pantalla', () => {
  const rows = [
    { id: 1, codigo: 'V1', cliente_nombre: 'Ana', habitacion_numero: 'Suite', estado: 1, metodo_pago: 'efectivo', usuarios: [{ nick: 'Lola' }], fecha_crea: '2026-01-02', total: 100 },
    { id: 2, estado: '0', metodo_pago: 'tarjeta', usuarios: [{}] },
    { id: 3, codigo: 'V3', cliente_nombre: 'Zoe', fecha_crea: '2026-01-01', total: '50' }
  ];
  it.each(['v1', 'ANA', 'suite', 'LOLA'])('busca la venta por %s', term => { expect(filterVentas(rows, term, 'all', 'all')).toEqual([rows[0]]); });
  it('combina estado y medio de pago y pagina sin modificar los datos', () => {
    expect(filterVentas(rows, '', '0', 'tarjeta')).toEqual([rows[1]]); expect(filterVentas(rows, 'missing', '1', 'efectivo')).toEqual([]);
    expect(calculatePagination(rows, 2, 2)).toMatchObject({ totalItems: 3, totalPages: 2, paginatedVentas: [rows[2]] }); expect(formatCurrency(1200)).toBe('1.200');
  });
  it.each(['fecha_crea', 'total', 'cliente_nombre', 'codigo', 'unknown'])('ordena de manera reversible por %s', field => {
    const asc = sortVentas(rows, field, 'asc'); const desc = sortVentas(rows, field, 'desc');
    expect(rows[0].id).toBe(1); if (field !== 'unknown') expect(desc[0]).toEqual(asc.at(-1)); else expect(asc).toEqual(rows);
  });
  it.each(['success', 'error-json', 'error-empty', 'error-text', 'error-body', 'network', 'unknown'])('maneja la solicitud de anulación: %s', async mode => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    if (mode === 'network') fetch.mockRejectedValue(new Error('offline')); else if (mode === 'unknown') fetch.mockRejectedValue('offline'); else fetch.mockResolvedValue({ ok: mode === 'success', status: 500, statusText: 'Error', json: async () => { if (['error-text', 'error-body'].includes(mode)) throw new Error('json'); return mode === 'error-json' ? { error: 'Sin permiso' } : {}; }, text: async () => { if (mode === 'error-body') throw new Error('body'); return 'error'; } });
    const result = await solicitarAnulacionVenta(1, mode === 'success' ? 'Duplicada' : undefined, mode === 'success' ? 100 : undefined);
    expect(result.success).toBe(mode === 'success'); if (mode === 'error-json') expect(result.error).toBe('Sin permiso'); if (mode === 'network') expect(result.error).toBe('offline');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ ventaId: 1, monto: mode === 'success' ? 100 : 0 });
  });
  it('usa detalles locales y consulta el servidor sólo cuando faltan', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const local = { id: 1, detalles: [] }; expect(await getVentaDetails('1', [local])).toEqual(local); expect(fetch).not.toHaveBeenCalled();
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: local }) }); expect(await getVentaDetails(1, [])).toEqual(local);
    fetch.mockResolvedValueOnce({ ok: false }); expect(await getVentaDetails(2, [])).toBeNull();
    fetch.mockRejectedValueOnce(new Error('offline')); expect(await getVentaDetails(2, [])).toBeNull();
  });
});
