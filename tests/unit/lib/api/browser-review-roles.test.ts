// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { RoleWriteSchema } from '@/lib/business/schemas/role';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  updateRole: vi.fn(),
  setStatus: vi.fn(),
  delete: vi.fn(),
  getById: vi.fn(),
  getUsersByRole: vi.fn(),
  notify: vi.fn()
}));
vi.mock('@/modules/identidad', () => ({ RoleService: mocks }));
vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: mocks.notify }));
vi.mock('@/lib/api/withRoute', () => ({
  withPublicRoute: (handler: unknown) => handler,
  withRoute: (_config: unknown, handler: unknown) => handler
}));
import { POST } from '@/app/api/roles/route';
import { PUT, DELETE } from '@/app/api/roles/[id]/route';
const context = { params: Promise.resolve({ id: 'rol-qa' }) };
const request = (body: unknown, action = '') =>
  new Request(`http://localhost/api/roles/rol-qa${action ? `?action=${action}` : ''}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getById.mockResolvedValue({ nombre: 'Auditor' });
  mocks.getUsersByRole.mockResolvedValue([]);
  mocks.create.mockResolvedValue('rol-qa');
});

it('normaliza los campos del formulario y descarta propiedades ajenas al rol', () => {
  expect(RoleWriteSchema.parse({ name: ' Auditor ', description: ' Control ', estado: 0 })).toEqual(
    { nombre: 'Auditor', descripcion: 'Control' }
  );
  expect(RoleWriteSchema.parse({ nombre: 'Auditor', descripcion: 'Control' })).toEqual({
    nombre: 'Auditor',
    descripcion: 'Control'
  });
  expect(RoleWriteSchema.safeParse({ name: ' ' }).success).toBe(false);
});
it('crea el rol usando el contrato del formulario web', async () => {
  const response = await POST(request({ name: 'Auditor', description: 'Control' }), {} as any);
  expect(response.status).toBe(201);
  expect(mocks.create).toHaveBeenCalledWith({ nombre: 'Auditor', descripcion: 'Control' });
});
it('edita el rol usando el id de la ruta y campos normalizados', async () => {
  expect(
    (await PUT(request({ name: 'Auditor nuevo', description: 'Control' }), context)).status
  ).toBe(200);
  expect(mocks.updateRole).toHaveBeenCalledWith('rol-qa', {
    nombre: 'Auditor nuevo',
    descripcion: 'Control'
  });
});
it.each([
  ['activate', 1],
  ['deactivate', 0]
] as const)('resuelve %s sin intentar leer un cuerpo JSON vacío', async (action, estado) => {
  const response = await PUT(
    new Request(`http://localhost/api/roles/rol-qa?action=${action}`, { method: 'PUT' }),
    context
  );
  expect(response.status).toBe(200);
  expect(mocks.setStatus).toHaveBeenCalledWith('rol-qa', estado);
  expect(mocks.updateRole).not.toHaveBeenCalled();
});
it('protege el rol administrador de renombrado, desactivación y eliminación', async () => {
  mocks.getById.mockResolvedValue({ nombre: 'Administrador' });
  expect((await PUT(request({ name: 'Otro nombre' }), context)).status).toBe(409);
  expect((await PUT(request({}, 'deactivate'), context)).status).toBe(409);
  expect((await DELETE(request({}), context)).status).toBe(409);
  expect(mocks.updateRole).not.toHaveBeenCalled();
  expect(mocks.setStatus).not.toHaveBeenCalled();
  expect(mocks.delete).not.toHaveBeenCalled();
});
it('no elimina un rol con usuarios asignados', async () => {
  mocks.getUsersByRole.mockResolvedValue([{ id: 'usuario' }]);
  expect((await DELETE(request({}), context)).status).toBe(409);
  expect(mocks.delete).not.toHaveBeenCalled();
});
it('no permite crear o renombrar un rol personalizado como administrador', async () => {
  expect((await POST(request({ name: 'Administrador' }), {} as any)).status).toBe(409);
  expect((await PUT(request({ name: 'Administrador' }), context)).status).toBe(409);
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.updateRole).not.toHaveBeenCalled();
});
