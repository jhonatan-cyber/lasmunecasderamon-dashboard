import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProductForm } from '@/hooks/personal/useProductForm';
import type { Product, Presentacion } from '@/types/product';

const mocks = vi.hoisted(() => ({
  client: { invalidateQueries: vi.fn() },
  fetch: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  revoke: vi.fn(),
  create: vi.fn(() => 'blob:test-photo')
}));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => mocks.client }));
vi.mock('sonner', () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock('@/lib/utils/codeUtils', () => ({ generateRandomCode: () => 'NEW-CODE' }));
vi.mock('@/lib/utils/logger', () => ({ default: { warn: vi.fn() } }));

const product = { id: 'p1', code: 'CODE', name: 'Ron', category_id: 'c1' } as Product;
const presentation = { id: 'pr1', nombre: '750 ml', codigo_barras: '123', stock: 2 } as Presentacion;
const response = (data: unknown, ok = true) => ({ ok, json: async () => data });
function setup(initialValues: Product | null = null, autoEditPresentation: Presentacion | null = null) {
  const onSubmit = vi.fn();
  const hook = renderHook(() => useProductForm({ open: true, initialValues, categoryId: 'c2', onSubmit, autoEditPresentation }));
  return { ...hook, onSubmit };
}
const change = (hook: ReturnType<typeof setup>, name: string, value: string) => act(() => hook.result.current.handleChange({ target: { name, value } }));
const submit = (hook: ReturnType<typeof setup>) => act(() => hook.result.current.handleSubmit({ preventDefault: vi.fn() } as any));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.fetch.mockImplementation(async (url: string) => response({ success: true, data: url.includes('/units?') ? { total: 2, inactivas: 1, unidades: [{ id: 7, codigo: 'U7' }] } : [presentation] }));
  mocks.create.mockReturnValue('blob:test-photo');
  vi.stubGlobal('fetch', mocks.fetch);
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: mocks.create, revokeObjectURL: mocks.revoke }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('catálogo de productos y presentaciones', () => {
  it('requiere nombre y presentación y envía el catálogo normalizado con fotos alineadas', () => {
    const h = setup();
    submit(h);
    expect(h.onSubmit).not.toHaveBeenCalled();
    expect(h.result.current.errors.name).toBeTruthy();
    expect(h.result.current.presentacionesError).toContain('al menos');
    change(h, 'code', ''); submit(h); expect(h.result.current.errors.code).toBeTruthy();
    change(h, 'code', 'RON'); change(h, 'name', 'RON añEJO'); change(h, 'description', 'suave');
    change(h, 'ml_shot', '50ml'); change(h, 'ml_shot_anfitriona', '30ml');
    act(() => h.result.current.addPresentacion()); submit(h);
    expect(h.result.current.presentacionesError).toContain('nombre');
    act(() => {
      h.result.current.updatePresentacion(0, 'nombre', ' 750 ml ');
      h.result.current.updatePresentacion(0, 'precio_compra', 'Bs 1200');
      h.result.current.updatePresentacion(0, 'stock', '2');
      h.result.current.setPresentacionFotoUrl(0, ' https://example.com/ron.png ');
      h.result.current.addPresentacion();
    });
    act(() => h.result.current.updatePresentacion(1, 'nombre', '1 litro'));
    submit(h);
    const data = h.onSubmit.mock.calls[0][0] as FormData;
    expect(data.get('name')).toBe('Ron Añejo');
    expect(data.get('description')).toBe('Suave');
    expect(data.get('category_id')).toBe('c2');
    expect(data.get('ml_shot')).toBe('50');
    expect(data.get('ml_shot_anfitriona')).toBe('30');
    expect(JSON.parse(String(data.get('presentaciones')))).toEqual([
      { nombre: '750 ml', precio_compra: '1200', cantidad: '2' },
      { nombre: '1 litro', precio_compra: '0', cantidad: '0' }
    ]);
    expect(data.get('presentacion_foto_0')).toBe('');
    expect(data.get('presentacion_fotourl_0')).toBe('https://example.com/ron.png');
    expect(data.get('presentacion_fotourl_1')).toBe('');
  });

  it('rechaza códigos duplicados entre filas y contra presentaciones existentes', async () => {
    const h = setup(product);
    await waitFor(() => expect(h.result.current.existentes).toHaveLength(1));
    act(() => { h.result.current.addPresentacion(); h.result.current.addPresentacion(); });
    act(() => {
      for (const index of [0, 1]) { h.result.current.updatePresentacion(index, 'nombre', 'Botella'); h.result.current.updatePresentacion(index, 'codigo_barras', '999'); }
    });
    submit(h); expect(h.result.current.presentacionesError).toContain('duplicado');
    act(() => h.result.current.removePresentacion(1));
    act(() => h.result.current.updatePresentacion(0, 'codigo_barras', '123'));
    submit(h); expect(h.result.current.presentacionesError).toContain('ya existe');
    act(() => h.result.current.updatePresentacion(0, 'codigo_barras', '456'));
    submit(h); expect((h.onSubmit.mock.calls[0][0] as FormData).get('category_id')).toBe('c1');
  });

  it('controla tipo, tamaño y liberación de fotos temporales', () => {
    const h = setup(); act(() => { h.result.current.addPresentacion(); h.result.current.addPresentacion(); });
    act(() => h.result.current.setPresentacionFoto(0, new File(['x'], 'bad.pdf', { type: 'application/pdf' })));
    expect(h.result.current.presentacionesError).toContain('JPG');
    const big = new File(['x'], 'big.png', { type: 'image/png' }); Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 });
    act(() => h.result.current.setPresentacionFoto(0, big)); expect(h.result.current.presentacionesError).toContain('5MB');
    const photo = new File(['x'], 'ok.png', { type: 'image/png' });
    act(() => h.result.current.setPresentacionFoto(0, photo)); expect(h.result.current.presentaciones[0].foto).toBe(photo);
    act(() => h.result.current.setPresentacionFotoUrl(0, '')); expect(h.result.current.presentaciones[0].foto).toBe(photo);
    act(() => h.result.current.setPresentacionFoto(0, photo)); expect(mocks.revoke).toHaveBeenCalledWith('blob:test-photo');
    act(() => h.result.current.setPresentacionFoto(0, null)); expect(h.result.current.presentaciones[0].fotoPreview).toBe('');
    act(() => h.result.current.setPresentacionFoto(0, photo));
    act(() => h.result.current.setPresentacionFotoUrl(0, 'https://example.com/photo.png')); expect(h.result.current.presentaciones[0].foto).toBeNull();
    act(() => h.result.current.setPresentacionFotoUrl(0, '')); expect(h.result.current.presentaciones[0].fotoPreview).toBe('');
    act(() => h.result.current.setPresentacionFoto(0, photo));
    act(() => h.result.current.removePresentacion(0)); expect(h.result.current.presentaciones).toHaveLength(1);
  });

  it('carga unidades con y sin metadatos y permite guardar sin nuevas presentaciones', async () => {
    const h = setup({ ...product, ml_shot: 0, ml_shot_anfitriona: 30, description: 'Original' });
    await waitFor(() => expect(h.result.current.cargandoInventario).toBe(false));
    expect(h.result.current.unidadesTotal).toBe(2);
    expect(h.result.current.unidadesInactivas).toBe(1);
    expect(h.result.current.unidadesCodigos[0]).toMatchObject({ id: '7', codigo_barras: null, estado: 'almacen' });
    expect(h.result.current.form.ml_shot).toBe('0');
    submit(h); expect((h.onSubmit.mock.calls[0][0] as FormData).get('id')).toBe('p1');
    mocks.fetch.mockImplementation(async (url: string) => response({ success: true, data: url.includes('/units?') ? { unidades: [{ id: '8', codigo: 'U8', codigo_barras: 123, estado: 'inactivo', compra_folio: 'C1', fecha_crea: '2026-01-01', fecha_impresion: '2026-01-02', presentacion_id: 'pr1' }] } : [] }));
    act(() => h.result.current.refreshInventario());
    await waitFor(() => expect(h.result.current.unidadesCodigos[0]?.id).toBe('8'));
    expect(h.result.current.unidadesTotal).toBe(0);
    expect(h.result.current.unidadesCodigos[0]).toMatchObject({ codigo_barras: '123', estado: 'inactivo' });
  });

  it.each(['failure', 'invalid-json', 'network'])('termina la carga de inventario ante %s', async mode => {
    mocks.fetch.mockImplementation(async () => { if (mode === 'network') throw new Error('offline'); return mode === 'invalid-json' ? { json: async () => { throw new Error('json'); } } : response({ success: false }); });
    const h = setup(product); await waitFor(() => expect(h.result.current.cargandoInventario).toBe(false));
    expect(h.result.current.existentes).toEqual([]); expect(h.result.current.unidadesTotal).toBe(0);
  });

  it('limita la generación de stock y recarga solamente tras éxito', async () => {
    const h = setup(product); await waitFor(() => expect(h.result.current.existentes).toHaveLength(1));
    await act(async () => h.result.current.agregarStock('pr1')); expect(mocks.error).toHaveBeenCalledWith('Indica una cantidad entre 1 y 1000');
    act(() => h.result.current.changeStockExtra('pr1', '1001')); await act(async () => h.result.current.agregarStock('pr1'));
    expect(mocks.fetch.mock.calls.filter(([, o]) => o?.method === 'POST')).toHaveLength(0);
    act(() => h.result.current.changeStockExtra('pr1', '3'));
    mocks.fetch.mockResolvedValueOnce(response({ success: true }));
    await act(async () => h.result.current.agregarStock('pr1'));
    const post = mocks.fetch.mock.calls.find(([, o]) => o?.method === 'POST');
    expect(JSON.parse(post![1].body)).toEqual({ producto_id: 'p1', presentacion_id: 'pr1', cantidad: 3 });
    expect(h.result.current.stockExtra.pr1).toBe(''); expect(h.result.current.agregandoStock).toBe(false);
  });

  it.each(['rejected', 'network'])('conserva la cantidad si agregar stock falla: %s', async mode => {
    const h = setup(product); await waitFor(() => expect(h.result.current.existentes).toHaveLength(1));
    act(() => h.result.current.changeStockExtra('pr1', '4'));
    if (mode === 'network') mocks.fetch.mockRejectedValueOnce(new Error('offline')); else mocks.fetch.mockResolvedValueOnce(response({ success: false, message: 'Denegado' }, false));
    await act(async () => h.result.current.agregarStock('pr1'));
    expect(h.result.current.stockExtra.pr1).toBe('4'); expect(mocks.error).toHaveBeenCalled(); expect(h.result.current.agregandoStock).toBe(false);
  });

  it('exige seleccionar exactamente las unidades a desactivar antes de reducir stock', async () => {
    const h = setup(product, presentation); await waitFor(() => expect(h.result.current.existentes).toHaveLength(1));
    act(() => h.result.current.changeEditPresDraft('stock', '0'));
    await act(async () => h.result.current.saveEditPres()); expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('Selecciona 2'));
    act(() => { h.result.current.toggleCodigoSeleccionado('u1'); h.result.current.toggleCodigoSeleccionado('u1'); h.result.current.toggleCodigoSeleccionado('u1'); h.result.current.toggleCodigoSeleccionado('u2'); });
    mocks.fetch.mockResolvedValueOnce(response({ success: true })).mockResolvedValueOnce(response({ success: true }));
    await act(async () => h.result.current.saveEditPres());
    const patch = mocks.fetch.mock.calls.find(([url, opts]) => url === '/api/products/units' && opts?.method === 'PATCH');
    expect(JSON.parse(patch![1].body)).toMatchObject({ ids: ['u1', 'u2'], estado: 'inactivo' });
    expect(h.result.current.editingPresId).toBeNull();
  });

  it.each([2, 5])('guarda la presentación para stock deseado %s y genera sólo la diferencia', async stock => {
    const h = setup(product); await waitFor(() => expect(h.result.current.existentes).toHaveLength(1));
    act(() => h.result.current.startEditPres({ ...presentation, precio_compra: 1200, precio_venta: 2400, comision: 100, ml_botella: 750 }));
    act(() => { h.result.current.changeEditPresDraft('stock', String(stock)); h.result.current.changeEditPresDraft('precio_compra', 'Bs 1500'); h.result.current.changeEditPresDraft('ml_botella', ''); });
    mocks.fetch.mockResolvedValueOnce(response({ success: true })); if (stock > 2) mocks.fetch.mockResolvedValueOnce(response({ success: true }));
    await act(async () => h.result.current.saveEditPres());
    const patch = mocks.fetch.mock.calls.find(([, o]) => o?.method === 'PATCH');
    expect(JSON.parse(patch![1].body)).toMatchObject({ precio_compra: '1500', ml_botella: '' });
    const post = mocks.fetch.mock.calls.find(([, o]) => o?.method === 'POST');
    if (stock > 2) expect(JSON.parse(post![1].body).cantidad).toBe(3); else expect(post).toBeUndefined();
  });

  it('no guarda sin presentación, nombre o stock válido y conserva la edición ante rechazo', async () => {
    const h = setup(product); await waitFor(() => expect(h.result.current.existentes).toHaveLength(1));
    await act(async () => h.result.current.saveEditPres());
    act(() => h.result.current.startEditPres({ id: 'pr1', nombre: '' } as Presentacion));
    await act(async () => h.result.current.saveEditPres()); expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('nombre'));
    act(() => { h.result.current.changeEditPresDraft('nombre', '750 ml'); h.result.current.changeEditPresDraft('stock', '-1'); });
    await act(async () => h.result.current.saveEditPres()); expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('entero'));
    act(() => h.result.current.changeEditPresDraft('stock', ''));
    mocks.fetch.mockResolvedValueOnce(response({ success: false }, false));
    await act(async () => h.result.current.saveEditPres()); expect(h.result.current.editingPresId).toBe('pr1'); expect(h.result.current.guardandoPres).toBe(false);
    mocks.fetch.mockRejectedValueOnce(new Error('offline')); await act(async () => h.result.current.saveEditPres()); expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('red'));
    act(() => h.result.current.cancelEditPres()); expect(h.result.current.codigosSeleccionados).toEqual([]);
  });

  it('no elimina presentaciones con stock y elimina las vacías', async () => {
    const h = setup(product); await waitFor(() => expect(h.result.current.existentes).toHaveLength(1));
    await act(async () => h.result.current.deleteExistente('pr1')); expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('2 unidades'));
    await act(async () => h.result.current.deleteExistente('empty')); expect(mocks.fetch).toHaveBeenCalledWith('/api/products/presentations?id=empty', { method: 'DELETE' });
  });

  it('valida y actualiza la foto de una presentación existente por archivo o URL', async () => {
    const h = setup(product); await waitFor(() => expect(h.result.current.existentes).toHaveLength(1));
    await act(async () => h.result.current.updateExistenteFoto('pr1', new File(['x'], 'file.pdf', { type: 'application/pdf' })));
    const big = new File(['x'], 'big.png', { type: 'image/png' }); Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 });
    await act(async () => h.result.current.updateExistenteFoto('pr1', big));
    await act(async () => h.result.current.updateExistenteFotoUrl('pr1', ' ')); expect(mocks.error).toHaveBeenCalledWith('Pega la URL de la imagen');
    mocks.fetch.mockResolvedValueOnce(response({ success: true }));
    await act(async () => h.result.current.updateExistenteFoto('pr1', new File(['x'], 'photo.png', { type: 'image/png' })));
    expect(mocks.success).toHaveBeenCalledWith('Foto actualizada correctamente');
    mocks.fetch.mockResolvedValueOnce(response({ success: false }, false)); await act(async () => h.result.current.updateExistenteFotoUrl('pr1', ' https://example.com/photo.png '));
    expect(mocks.error).toHaveBeenCalledWith('No se pudo actualizar la foto');
    mocks.fetch.mockRejectedValueOnce(new Error('offline')); await act(async () => h.result.current.updateExistenteFotoUrl('pr1', 'https://example.com/photo.png'));
    expect(mocks.error).toHaveBeenCalledWith('Error de red al actualizar la foto');
    mocks.fetch.mockResolvedValueOnce(response({ success: true })); await act(async () => h.result.current.updateExistenteFotoUrl('pr1', 'https://example.com/photo.png'));
  });
});
