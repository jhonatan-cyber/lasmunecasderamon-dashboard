import { describe, expect, it } from 'vitest';
import { generarPdfCierreCaja } from '@/modules/caja/turnos/cierrePdf';

describe('generarPdfCierreCaja', () => {
  it('genera un PDF con el arqueo y el monto final', () => {
    const pdf = generarPdfCierreCaja({
      caja_id: 'caja-12345678',
      estado: 'aprobada',
      cajero_nombre: 'Cajero de prueba',
      resuelto_por: 'Administrador',
      fecha_apertura: '2026-10-08T20:00:00.000Z',
      fecha_cierre: '2026-10-09T05:00:00.000Z',
      solicitado_por: 'Cajero de prueba',
      venta: 120000,
      servicio: 30000,
      propina: 5000,
      comision: 10000,
      anticipo: 0,
      iva: 0,
      monto_apertura: 50000,
      efectivo: 70000,
      tarjeta: 40000,
      transferencia: 20000,
      devolucion: 0,
      retiro_total: 0,
      saldo_clientes_descontado: 5000,
      prepago_cargado: 0,
      prepago_consumido: 0,
      prepago_pendiente_clientes: 5000,
      ventas_por_producto: [
        { producto: 'Cóctel de prueba', unidades: 8, monto: 64000 },
        { producto: 'Bebida de prueba', unidades: 5, monto: 25000 }
      ],
      monto_cierre_calculado: 175000
    });

    expect(pdf.subarray(0, 8).toString()).toBe('%PDF-1.3');
    expect(pdf.byteLength).toBeGreaterThan(1000);
  });
});
