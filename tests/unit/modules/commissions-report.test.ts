// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCommissionsReport } from '@/modules/reportes/informes/comisiones';
const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('@/lib/database/db', () => ({ query: mocks.query }));
vi.mock('@/lib/utils/logger', () => ({ logger: { error: vi.fn() } }));
beforeEach(() => { vi.resetAllMocks(); mocks.query.mockResolvedValue([]); });
describe('reporte de comisiones', () => {
  it.each(['current_month', 'last_month', 'current_year', 'last_year', 'custom', 'unknown'])('consulta el período %s con parámetros seguros', async period => {
    const report = await getCommissionsReport(period as any, '2026-01-01', '2026-01-31');
    expect(report.statistics.total_anfitrionas).toBe(0); expect(report.statistics.promedio_comision_por_anfitriona).toBe(0);
    expect(mocks.query.mock.calls[0][1]).toEqual(period === 'custom' ? ['2026-01-01 00:00:00', '2026-01-31 23:59:59'] : []);
  });
  it('normaliza números de PostgreSQL y calcula promedios con y sin operaciones', async () => {
    const complete = { id_usuario: '1', nombre_completo: 'Ana', total_ventas: '2', total_servicios: '1', total_ventas_monto: '200', total_servicios_monto: '100', total_comisiones: '30', promedio_por_venta: '10', promedio_por_servicio: '10', dias_trabajados: '1', promedio_diario: '30' };
    mocks.query.mockResolvedValueOnce([complete, { id_usuario: '2' }]).mockResolvedValueOnce([complete, {}]);
    const report = await getCommissionsReport('current_month'); expect(report.statistics).toMatchObject({ total_anfitrionas: 2, promedio_venta_general: 100, promedio_servicio_general: 100, promedio_comision_por_anfitriona: 15 }); expect(report.topPerformers[0].total_comisiones).toBe(30); expect(report.dailyCommissions[1].total_comisiones).toBe(0);
  });
  it('usa un período seguro cuando el rango personalizado está incompleto', async () => { await getCommissionsReport('custom'); expect(mocks.query.mock.calls[0][1]).toEqual([]); });
  it('propaga el fallo de consultas sin devolver totales inventados', async () => { mocks.query.mockRejectedValue(new Error('offline')); await expect(getCommissionsReport('current_month')).rejects.toThrow('Error al obtener reporte'); });
});
