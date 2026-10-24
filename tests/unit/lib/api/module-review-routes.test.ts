import { beforeEach, expect, it, vi } from 'vitest';
import { UserProfileUpdateSchema, UserUpdateSchema } from '@/lib/business/schemas/user';

const mocks = vi.hoisted(() => ({ pay: vi.fn(), updateStatus: vi.fn() }));
vi.mock('@/lib/api/withRoute', () => ({
  withPublicRoute: (handler: unknown) => handler,
  withRoute:
    (_options: unknown, handler: any) =>
    (request: Request, context: any = {}) =>
      handler(request, { ...context, user: { id: 'cajero-real' } })
}));
vi.mock('@/modules/personal', () => ({ PayrollService: { pay: mocks.pay } }));
vi.mock('@/workflows/ventas', () => ({ SaleService: { updateStatus: mocks.updateStatus } }));
beforeEach(() => vi.clearAllMocks());

it('la edición de perfil descarta rol, sueldo, descuentos, RUN y estado', () => {
  const result = UserProfileUpdateSchema.parse({
    id: 'u',
    name: 'Ana',
    rol_id: 'admin',
    salary: 999999,
    contributions: 0,
    discount: 0,
    run: 'nuevo',
    estado: 1
  });
  expect(result).toEqual({ id: 'u', name: 'Ana' });
  expect(UserUpdateSchema.parse(result)).not.toHaveProperty('estado_servicio');
});

it('la nómina registra al cajero autenticado como entregador', async () => {
  mocks.pay.mockResolvedValueOnce({ total: 15000, componentes: [] });
  const { POST } = await import('@/app/api/payroll/route');
  const response = await POST(
    new Request('http://localhost/api/payroll', {
      method: 'POST',
      body: JSON.stringify({
        usuario_id: 'beneficiario',
        entregado_por: 'falso',
        total_esperado: 15000
      })
    }) as any,
    {} as any
  );
  expect(response.status).toBe(200);
  expect(mocks.pay).toHaveBeenCalledWith('beneficiario', 'cajero-real', 15000);
});

it.each([0, '0', null, -1, {}])(
  'PATCH de ventas no permite anular ni inyectar un estado inválido: %j',
  async estado => {
    const { PATCH } = await import('@/app/api/sales/[id]/route');
    const response = await PATCH(
      new Request('http://localhost/api/sales/venta', {
        method: 'PATCH',
        body: JSON.stringify({ estado })
      }) as any,
      { params: Promise.resolve({ id: 'venta' }) } as any
    );
    expect([400, 409]).toContain(response.status);
    expect(mocks.updateStatus).not.toHaveBeenCalled();
  }
);
