// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getById: vi.fn(),
  getSolicitudCierreByToken: vi.fn(),
  generarPdf: vi.fn(),
  leerToken: vi.fn(),
  productos: vi.fn(),
  warn: vi.fn()
}));
vi.mock('@/lib/api/withRoute', () => ({
  withPublicRoute: (handler: unknown) => handler
}));
vi.mock('@/modules/caja', () => ({
  CashRegisterService: {
    getById: mocks.getById,
    getSolicitudCierreByToken: mocks.getSolicitudCierreByToken
  },
  generarPdfCierreCaja: mocks.generarPdf
}));
vi.mock('@/modules/reportes', () => ({
  VentasStatsService: { getVentasPorProducto: mocks.productos }
}));
vi.mock('@/lib/api/cajaReportePdfToken', () => ({ leerTokenCajaReporte: mocks.leerToken }));
vi.mock('@/lib/utils/logger', () => ({ default: { warn: mocks.warn } }));

import { GET as reportGET } from '@/app/api/cashregister/pdf-report/route';
import { GET as closingGET } from '@/app/api/cashregister/closing-pdf/route';

const CAJA = {
  id_caja: 'caja-12345678',
  estado: 0,
  cierre_pendiente: false,
  cajero_nombre: 'Cajero responsable',
  cajero_cierre_nombre: 'Persona autorizadora',
  cierre_solicitado_por: 'Cajero solicitante',
  usuario_id_cierre: 'id-autorizador',
  fecha_apertura: '2026-10-08 17:00:00',
  fecha_cierre: '2026-10-09T05:00:00Z',
  ventas: 120000,
  servicios: 30000,
  propina: 5000,
  comision: 10000,
  anticipo: 2000,
  iva: 15000,
  monto_apertura: 50000,
  efectivo: 70000,
  tarjeta: 40000,
  transferencia: 20000,
  devoluciones: 3000,
  retiro_total: 2000,
  saldo_clientes_descontado: 5000,
  saldo_clientes_por_devolver: 0,
  prepago_cargado: 15000,
  prepago_consumido: 10000,
  prepago_pendiente_clientes: 5000,
  monto_cierre: 175000
};
const PRODUCTS = [{ producto: 'Cóctel de prueba', unidades: 8, monto: 64000 }];
const PDF = Buffer.from('%PDF-1.3\ncontenido-local');
const call = (handler: typeof reportGET, path: string, token?: string) => {
  const url = new URL(`http://localhost/api/cashregister/${path}`);
  if (token !== undefined) url.searchParams.set('token', token);
  return handler(new Request(url), { params: {} });
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.leerToken.mockResolvedValue(CAJA.id_caja);
  mocks.getById.mockResolvedValue(CAJA);
  mocks.productos.mockResolvedValue(PRODUCTS);
  mocks.generarPdf.mockResolvedValue(PDF);
});

describe('GET /api/cashregister/pdf-report', () => {
  it('mapea nombres y campos financieros reales sin cambiar fechas o monto persistido', async () => {
    const response = await call(reportGET, 'pdf-report', ' token-firmado ');
    expect(response.status).toBe(200);
    expect(mocks.leerToken).toHaveBeenCalledWith('token-firmado');
    expect(mocks.getById).toHaveBeenCalledWith(CAJA.id_caja);
    expect(mocks.productos).toHaveBeenCalledWith(CAJA.id_caja);
    expect(mocks.generarPdf).toHaveBeenCalledExactlyOnceWith({
      ...CAJA,
      caja_id: CAJA.id_caja,
      estado: 'Cerrada',
      resuelto_por: 'Persona autorizadora',
      solicitado_por: 'Cajero solicitante',
      venta: 120000,
      servicio: 30000,
      devolucion: 3000,
      monto_cierre_calculado: 175000,
      ventas_por_producto: PRODUCTS
    });
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="reporte-caja-caja-123.pdf"'
    );
    expect(response.headers.get('Content-Length')).toBe(String(PDF.byteLength));
    expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(Buffer.from(await response.arrayBuffer())).toEqual(PDF);
  });

  it.each([
    [false, 'Abierta'],
    [true, 'Pendiente de autorización']
  ])('no atribuye autorización a una caja abierta (pendiente=%s)', async (pendiente, estado) => {
    mocks.getById.mockResolvedValue({
      ...CAJA,
      estado: 1,
      cierre_pendiente: pendiente,
      monto_cierre: null
    });
    await call(reportGET, 'pdf-report', 'token');
    expect(mocks.generarPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        estado,
        resuelto_por: null,
        solicitado_por: 'Cajero solicitante',
        monto_cierre_calculado: 175000
      })
    );
  });

  it('no usa IDs ni nombres inventados si no hay personas registradas', async () => {
    mocks.getById.mockResolvedValue({
      ...CAJA,
      cajero_cierre_nombre: null,
      cierre_solicitado_por: null
    });
    await call(reportGET, 'pdf-report', 'token');
    expect(mocks.generarPdf).toHaveBeenCalledWith(
      expect.objectContaining({ resuelto_por: null, solicitado_por: null })
    );
  });

  it('conserva un cierre persistido de cero en lugar de recalcularlo', async () => {
    mocks.getById.mockResolvedValue({ ...CAJA, monto_cierre: 0 });
    await call(reportGET, 'pdf-report', 'token');
    expect(mocks.generarPdf).toHaveBeenCalledWith(
      expect.objectContaining({ monto_cierre_calculado: 0 })
    );
  });

  it('omite solo el ranking si no se puede obtener', async () => {
    mocks.productos.mockRejectedValue(new Error('Ranking no disponible'));
    const response = await call(reportGET, 'pdf-report', 'token');
    expect(response.status).toBe(200);
    expect(mocks.warn).toHaveBeenCalledOnce();
    expect(mocks.generarPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        monto_cierre_calculado: 175000,
        ventas_por_producto: []
      })
    );
  });

  it.each([undefined, '', ' ', 'x'.repeat(2049)])(
    'rechaza el token malformado %s sin leer la caja',
    async token => {
      const response = await call(reportGET, 'pdf-report', token);
      expect(response.status).toBe(400);
      expect(mocks.leerToken).not.toHaveBeenCalled();
      expect(mocks.getById).not.toHaveBeenCalled();
      expect(mocks.generarPdf).not.toHaveBeenCalled();
    }
  );

  it('rechaza un token vencido antes de obtener datos financieros', async () => {
    mocks.leerToken.mockResolvedValue(null);
    const response = await call(reportGET, 'pdf-report', 'vencido');
    expect(response.status).toBe(401);
    expect(mocks.getById).not.toHaveBeenCalled();
    expect(mocks.productos).not.toHaveBeenCalled();
    expect(mocks.generarPdf).not.toHaveBeenCalled();
  });

  it('devuelve 404 cuando la caja no existe', async () => {
    mocks.getById.mockResolvedValue(null);
    const response = await call(reportGET, 'pdf-report', 'token');
    expect(response.status).toBe(404);
    expect(mocks.productos).not.toHaveBeenCalled();
    expect(mocks.generarPdf).not.toHaveBeenCalled();
  });
});

describe('GET /api/cashregister/closing-pdf', () => {
  const SOLICITUD = {
    caja_id: CAJA.id_caja,
    estado: 'aprobada',
    caja_estado: 0,
    cajero_nombre: CAJA.cajero_nombre,
    solicitado_por: 'Nombre de la solicitud',
    resuelto_por: 'Nombre de la resolución',
    motivo: 'Cierre del turno nocturno',
    fecha_apertura: CAJA.fecha_apertura,
    fecha_cierre: CAJA.fecha_cierre,
    fecha_resolucion: '2026-10-09 02:00:00',
    monto_cierre_calculado: 175000,
    venta: 120000,
    servicio: 30000,
    devolucion: 3000,
    retiro_total: 2000,
    saldo_clientes_descontado: 5000,
    prepago_pendiente_clientes: 5000
  };

  it('conserva íntegro el contrato de la solicitud que consume el mismo generador', async () => {
    mocks.getSolicitudCierreByToken.mockResolvedValue(SOLICITUD);
    const response = await call(closingGET, 'closing-pdf', ' token-solicitud ');
    expect(response.status).toBe(200);
    expect(mocks.getSolicitudCierreByToken).toHaveBeenCalledWith('token-solicitud');
    expect(mocks.generarPdf).toHaveBeenCalledExactlyOnceWith(SOLICITUD);
    expect(mocks.getById).not.toHaveBeenCalled();
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('Content-Length')).toBe(String(PDF.byteLength));
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(Buffer.from(await response.arrayBuffer())).toEqual(PDF);
  });

  it.each(['pendiente', 'rechazada', 'expirada'])(
    'no genera PDF para una solicitud %s',
    async estado => {
      mocks.getSolicitudCierreByToken.mockResolvedValue({ ...SOLICITUD, estado });
      const response = await call(closingGET, 'closing-pdf', 'token');
      expect(response.status).toBe(409);
      expect(mocks.generarPdf).not.toHaveBeenCalled();
    }
  );

  it.each([undefined, '', ' ', 'x'.repeat(257)])('rechaza el token malformado %s', async token => {
    const response = await call(closingGET, 'closing-pdf', token);
    expect(response.status).toBe(400);
    expect(mocks.getSolicitudCierreByToken).not.toHaveBeenCalled();
    expect(mocks.generarPdf).not.toHaveBeenCalled();
  });

  it('rechaza una solicitud inexistente', async () => {
    mocks.getSolicitudCierreByToken.mockResolvedValue(null);
    const response = await call(closingGET, 'closing-pdf', 'desconocido');
    expect(response.status).toBe(404);
    expect(mocks.generarPdf).not.toHaveBeenCalled();
  });
});
