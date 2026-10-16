// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock('@/lib/database/db', () => ({ query, generateUUID: vi.fn() }));
vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-10-16 12:00:00'
}));
import { NotificationRepository } from '@/modules/comunicaciones/notificaciones/repositorio';

beforeEach(() => query.mockClear());

it('solo marca una notificación perteneciente al usuario o a su rol', async () => {
  await NotificationRepository.markAsReadForUser('usuario', 'notificacion');
  const [sql, params] = query.mock.calls[0];
  expect(sql).toContain('usuario_id = ? OR LOWER(rol_destinatario)');
  expect(sql).toContain('WHERE u.id_usuario = ?');
  expect(sql).toContain('AND leida = 0 AND id = ?');
  expect(params).toEqual(['2026-10-16 12:00:00', 'usuario', 'usuario', 'notificacion']);
});

it('marcar todas conserva el filtro de destinatario', async () => {
  await NotificationRepository.markAsReadForUser('usuario');
  const [sql, params] = query.mock.calls[0];
  expect(sql).toContain('usuario_id = ? OR LOWER(rol_destinatario)');
  expect(sql).not.toContain('AND id = ?');
  expect(params).toEqual(['2026-10-16 12:00:00', 'usuario', 'usuario']);
});
