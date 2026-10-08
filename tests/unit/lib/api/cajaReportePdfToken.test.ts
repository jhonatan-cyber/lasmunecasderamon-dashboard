// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { crearTokenCajaReporte, leerTokenCajaReporte } from '@/lib/api/cajaReportePdfToken';

describe('token de acceso temporal al PDF de caja', () => {
  it('firma el identificador de la caja para descargar el reporte', async () => {
    const token = await crearTokenCajaReporte('caja-123');

    await expect(leerTokenCajaReporte(token)).resolves.toBe('caja-123');
  });

  it('rechaza tokens inválidos', async () => {
    await expect(leerTokenCajaReporte('token-invalido')).resolves.toBeNull();
  });
});
