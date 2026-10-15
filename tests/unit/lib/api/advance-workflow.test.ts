// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const personal = vi.hoisted(() => ({
  entregarAnticipo: vi.fn(),
  procesarSolicitud: vi.fn(),
  solicitarAnticipo: vi.fn(),
  listarAnticipos: vi.fn()
}));
vi.mock('@/modules/personal', () => personal);
vi.mock('@/lib/api/withRoute', () => ({
  withRoute: (_config: unknown, handler: unknown) => handler
}));
vi.mock('@/lib/middleware/auth', () => ({
  isAdministrator: (user: { role: string }) => user.role.toLowerCase() === 'administrador'
}));
import { PUT } from '@/app/api/anticipos/[id]/route';
import { POST } from '@/app/api/anticipos/route';

async function process(role: string, estado?: number) {
  return PUT(
    new Request('http://localhost/api/anticipos/test', {
      method: 'PUT',
      body: JSON.stringify({ estado, entregado_por: 'forged' })
    }),
    { params: Promise.resolve({ id: 'test' }), user: { id: 'actor', role } } as never
  );
}
beforeEach(() => vi.clearAllMocks());
describe('Flujo de anticipos: solicitud, aprobación y entrega separadas', () => {
  it.each(['Barman', 'garzon', 'anfitriona'])('%s no puede aprobar ni entregar', async role => {
    for (const estado of [0, 1, 3]) expect((await process(role, estado)).status).toBe(403);
    expect(personal.entregarAnticipo).not.toHaveBeenCalled();
    expect(personal.procesarSolicitud).not.toHaveBeenCalled();
  });
  it('el cajero no puede aprobar, pero entrega con su identidad autenticada', async () => {
    expect((await process('cajero', 1)).status).toBe(403);
    expect((await process('cajero', 3)).status).toBe(403);
    expect((await process('cajero', 0)).status).toBe(200);
    expect(personal.entregarAnticipo).toHaveBeenCalledWith('test', 'actor');
    expect(personal.procesarSolicitud).not.toHaveBeenCalled();
  });
  it('el administrador aprueba o rechaza y no entrega efectivo', async () => {
    expect((await process('administrador', 1)).status).toBe(200);
    expect((await process('administrador', 3)).status).toBe(200);
    expect((await process('administrador', 0)).status).toBe(403);
    expect(personal.procesarSolicitud).toHaveBeenCalledWith('test', 'approve', 'actor');
    expect(personal.procesarSolicitud).toHaveBeenCalledWith('test', 'reject', 'actor');
    expect(personal.entregarAnticipo).not.toHaveBeenCalled();
  });
  it('un estado omitido nunca se convierte en una entrega', async () => {
    expect((await process('cajero')).status).toBe(400);
    expect(personal.entregarAnticipo).not.toHaveBeenCalled();
  });
  it('el administrador crea solicitudes en vez de entregar dinero directamente', async () => {
    const body = { usuario_id: 'employee', monto: 1000, motivo: 'Adelanto' };
    const res = await POST(
      new Request('http://localhost/api/anticipos', { method: 'POST', body: JSON.stringify(body) }),
      { params: Promise.resolve({}), user: { id: 'admin', role: 'administrador' } } as never
    );
    expect(res.status).toBe(201);
    expect(personal.solicitarAnticipo).toHaveBeenCalledWith('employee', body, 'admin');
    expect(personal.entregarAnticipo).not.toHaveBeenCalled();
  });
});
