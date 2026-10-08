// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as gratificaciones from '@/modules/personal/gratificaciones/consultas';
const mocks = vi.hoisted(() => ({ query: vi.fn(), insert: vi.fn(), update: vi.fn(), remove: vi.fn(), whatsapp: vi.fn(), push: vi.fn(), notify: vi.fn(), table: true, users: true, requester: true, pending: 0, mirror: true, row: {} as any }));
vi.mock('@/lib/database/db', () => ({ query: mocks.query, generateUUID: () => 'g1', withTransaction: (fn: any) => fn(mocks.query) }));
vi.mock('@/lib/database/base-repository', () => ({ BaseRepository: { insert: mocks.insert, update: mocks.update, delete: mocks.remove } }));
vi.mock('@/modules/comunicaciones', () => ({ enviarWhatsApp: mocks.whatsapp, sendPushByRole: mocks.push, sendPushNotification: mocks.push }));
vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: mocks.notify }));
vi.mock('@/lib/business/whatsappConfig', () => ({ getAdminWhatsApp: async () => 'test-recipient' }));
vi.mock('@/lib/utils/logger', () => ({ default: { error: vi.fn() } }));
beforeEach(() => {
  vi.resetAllMocks(); mocks.table = true; mocks.users = true; mocks.requester = true; mocks.pending = 0; mocks.mirror = true;
  mocks.row = { id: 'g1', usuario_id: 'u1', nombre: 'Ana', apellido: 'Pérez', estado: 2, monto: 100 };
  mocks.whatsapp.mockResolvedValue(true); mocks.push.mockResolvedValue(true);
  mocks.query.mockImplementation(async (sql: string, params: any[] = []) => {
    if (sql.includes('information_schema')) return mocks.table ? [{}] : [];
    if (sql.includes('FROM usuarios')) return (params[0] === 'u1' ? mocks.users : mocks.requester) ? [{ nombre: 'Ana', apellido: 'Pérez', nick: params[0] === 'u1' ? '' : 'Admin' }] : [];
    if (sql.includes('COUNT(*)')) return [{ count: mocks.pending }];
    if (sql.includes('FROM anticipos')) return mocks.mirror ? [{ estado: 2 }] : [];
    if (sql.includes('FROM gratificaciones')) return mocks.row ? [mocks.row] : [];
    return [];
  });
  vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://example.com');
});
describe('solicitudes y pagos de gratificaciones', () => {
  it.each([[false, false, true, 0], [true, false, true, 0], [true, true, false, 0], [true, true, true, 1]])('no crea solicitudes inválidas: tabla=%s usuario=%s solicitante=%s pendientes=%s', async (table, users, requester, pending) => {
    Object.assign(mocks, { table, users, requester, pending }); await expect(gratificaciones.requestGratificacion('u1', 100, undefined, 'admin')).rejects.toThrow(); expect(mocks.insert).not.toHaveBeenCalled(); expect(mocks.whatsapp).not.toHaveBeenCalled();
  });
  it.each([true, false])('solicita con vínculo opcional al anticipo: %s', async mirror => {
    if (!mirror) { vi.stubEnv('NEXT_PUBLIC_BASE_URL', ''); mocks.whatsapp.mockRejectedValue(new Error('transport')); mocks.push.mockRejectedValue(new Error('push')); mocks.query.mockImplementation(async (sql: string) => sql.includes('information_schema') ? [{}] : sql.includes('FROM usuarios') ? [{ nombre: 'Ana', apellido: 'Pérez' }] : []); }
    const result = await gratificaciones.requestGratificacion('u1', 100, mirror ? 'Bono' : undefined, 'admin', mirror);
    expect(mocks.insert).toHaveBeenCalledTimes(mirror ? 3 : 1); expect(mocks.insert.mock.calls[0][2]).toMatchObject({ usuario_id: 'u1', solicitante_id: 'admin', estado: 2 });
    expect(mocks.whatsapp).toHaveBeenCalledWith('test-recipient', expect.stringContaining(mirror ? 'https://example.com' : 'APROBAR GRATIFICACION'));
    expect(result).toEqual(mirror ? mocks.row : null);
  });
  it('resuelve estados históricos y datos opcionales en el listado', async () => {
    mocks.query.mockImplementation(async (sql: string) => sql.includes('information_schema') ? [{}] : [0, 1, 2, 3, 9].map(estado => ({ ...mocks.row, estado, solicitante_id: estado ? 'admin' : null, solicitante: estado ? ' Admin ' : ' ', usuario_foto: estado ? 'photo.png' : null, descripcion: estado ? 'Bono' : '', fecha_mod_fmt: estado ? '2026-01-01' : null })));
    const rows = await gratificaciones.getAllGratificaciones(); expect(rows.map(row => row.estado_texto)).toEqual(['pagado', 'por_pagar', 'pendiente_aprobacion', 'rechazada', 'desconocido']); expect(rows[0].solicitante).toBeNull(); expect(rows[1].solicitante).toBe('Admin');
    mocks.table = false; mocks.query.mockResolvedValue([]); expect(await gratificaciones.getAllGratificaciones()).toEqual([]);
  });
  it('crea y actualiza con resultado ausente o disponible sin cambiar el contrato', async () => {
    expect(await gratificaciones.createGratificacion({ usuario_id: 'u1', monto: 100 })).toEqual(mocks.row);
    mocks.row = null; expect(await gratificaciones.updateGratificacion('g1', { monto: 200 })).toBeNull();
    expect(await gratificaciones.createGratificacion({ usuario_id: 'u1', monto: 100, descripcion: 'Bono', solicitante_id: 'admin' })).toBeNull();
    mocks.table = false; expect(await gratificaciones.createGratificacion({ usuario_id: 'u1', monto: 100 })).toBe('g1');
    await gratificaciones.deleteGratificacion('g1'); expect(mocks.remove).toHaveBeenCalledWith(mocks.query, 'gratificaciones', 'id', 'g1');
  });
  it.each([null, { estado: 1 }, { estado: 2, monto: 101 }])('procesar exige existencia, estado pendiente y monto esperado: %s', async row => {
    mocks.row = row; await expect(gratificaciones.processGratificacionSolicitud('g1', 'approve', 'admin', 100)).rejects.toThrow(); expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each(['approve', 'reject'] as const)('procesa %s, sincroniza anticipo y tolera transporte fallido', async action => {
    mocks.row.telefono = 'test-number'; mocks.row.nick = 'Ana'; mocks.whatsapp.mockRejectedValue(new Error('transport'));
    const result = await gratificaciones.processGratificacionSolicitud('g1', action, 'admin', 100); expect(result).toMatchObject({ ok: true, estado: action === 'approve' ? 1 : 3 }); expect(mocks.update).toHaveBeenCalledTimes(2); expect(mocks.notify).toHaveBeenCalledWith('gratificacion_processed', expect.objectContaining({ accion: action }));
  });
  it('procesa sin anticipo asociado ni teléfono y admite ausencia de admin', async () => {
    mocks.mirror = false; mocks.row.monto = undefined; const result = await gratificaciones.processGratificacionSolicitud('g1', 'approve'); expect(result.ok).toBe(true); expect(mocks.update).toHaveBeenCalledTimes(1); expect(mocks.whatsapp).toHaveBeenCalledTimes(1);
  });
  it('detalle de solicitud sólo expone pendientes, normalizando valores opcionales', async () => {
    expect(await gratificaciones.getGratificacionSolicitudDetalle('g1')).toMatchObject({ monto: 100, descripcion: '', nick: '' }); mocks.row = null; await expect(gratificaciones.getGratificacionSolicitudDetalle('g1')).rejects.toThrow(); mocks.row = { estado: 1 }; await expect(gratificaciones.getGratificacionSolicitudDetalle('g1')).rejects.toThrow('procesada');
    mocks.row = { estado: 2, nombre: 'Ana', apellido: 'Pérez', nick: 'Ana', descripcion: 'Bono' }; expect(await gratificaciones.getGratificacionSolicitudDetalle('g1')).toMatchObject({ monto: 0, nick: 'Ana', descripcion: 'Bono' });
  });
  it.each(['getAllGratificaciones', 'createGratificacion', 'requestGratificacion', 'getGratificacionSolicitudDetalle', 'processGratificacionSolicitud', 'updateGratificacion', 'deleteGratificacion'] as const)('propaga el error de escritura o lectura en %s', async method => {
    mocks.query.mockRejectedValue(new Error('offline')); mocks.remove.mockRejectedValue(new Error('offline')); mocks.update.mockRejectedValue(new Error('offline'));
    const args = method === 'createGratificacion' ? [{ usuario_id: 'u1', monto: 100 }] : method === 'updateGratificacion' ? ['g1', { monto: 100 }] : method === 'processGratificacionSolicitud' ? ['g1', 'approve'] : ['u1', 100, undefined, 'admin'];
    await expect((gratificaciones[method] as any)(...args)).rejects.toThrow('Error');
  });
});
