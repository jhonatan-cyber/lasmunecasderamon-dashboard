// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * El enfriamiento vive en el repositorio junto al cálculo en SQL; acá solo hace falta el
 * número para no arrastrar el módulo de base de datos a un test de unidad.
 */
vi.mock('@/modules/caja/turnos/repositorio', () => ({
  AVISO_CIERRE_ENFRIAMIENTO_MS: 60_000
}));

const service = vi.hoisted(() => ({
  getCierrePendiente: vi.fn(),
  segundosParaReenviarAviso: vi.fn(),
  getById: vi.fn(),
  registrarAvisoCierre: vi.fn(),
  procesarCierreCaja: vi.fn(),
  solicitarCierreCaja: vi.fn(),
  closeCaja: vi.fn()
}));

vi.mock('@/modules/caja/turnos/servicio', () => ({ CashRegisterService: service }));

const whatsapp = vi.hoisted(() => ({ enviarMensajeSolicitudCierreCaja: vi.fn() }));
vi.mock('@/modules/comunicaciones/whatsapp/adaptador', () => whatsapp);

vi.mock('@/lib/middleware/auth', () => ({ isAdministrator: () => false }));

vi.mock('@/lib/utils/logger', () => {
  const mocks = { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() };
  return { logger: mocks, default: mocks };
});

import { reenviarAvisoCierreCaja, respuestaReenvioAviso } from '@/lib/api/cierreCaja';

const PENDIENTE = {
  token: 'tok-1',
  caja_id: 'caja-1',
  estado: 'pendiente',
  solicitado_por: 'CajeroTest',
  ultimo_aviso_en: '2026-09-28 16:20:00',
  saldo_clientes_descontado: 12000,
  monto_cierre_calculado: 160000,
  motivo: 'Cierre de turno'
};

const CAJA = {
  id_caja: 'caja-1',
  fecha_apertura: '2026-09-28 12:00:00',
  monto_apertura: 100000,
  efectivo: 50000,
  tarjeta: 20000,
  transferencia: 5000,
  devoluciones: 3000,
  retiro_total: 0,
  ventas: 78000,
  servicios: 40000,
  propina: 9000,
  comision: 7000,
  anticipo: 2000,
  iva: 15000,
  prepago_cargado: 30000,
  prepago_consumido: 18000,
  prepago_pendiente_clientes: 12000
};

/**
 * Reenvío del aviso de un cierre que quedó pendiente.
 *
 * El cierre se puede quedar en silencio: el WhatsApp no llegó o el administrador no lo vio,
 * y el servidor solo admite una solicitud por turno. Reenviar manda **la misma** solicitud
 * (mismo token y mismo link), con un enfriamiento para no convertir el WhatsApp del
 * administrador en spam.
 */
describe('reenviarAvisoCierreCaja', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.getCierrePendiente.mockResolvedValue(PENDIENTE);
    service.segundosParaReenviarAviso.mockResolvedValue(0);
    service.getById.mockResolvedValue(CAJA);
    service.registrarAvisoCierre.mockResolvedValue('2026-09-28 16:35:00');
    whatsapp.enviarMensajeSolicitudCierreCaja.mockResolvedValue(true);
  });

  it('sin cierre pendiente no hay nada que reenviar', async () => {
    service.getCierrePendiente.mockResolvedValue(null);

    const resultado = await reenviarAvisoCierreCaja({
      id_caja: 'caja-1',
      solicitante: 'CajeroTest'
    });

    expect(resultado.avisado).toBe(false);
    expect(resultado.httpStatus).toBe(409);
    expect(resultado.message).toMatch(/no tiene un cierre/i);
    expect(whatsapp.enviarMensajeSolicitudCierreCaja).not.toHaveBeenCalled();
    expect(service.registrarAvisoCierre).not.toHaveBeenCalled();
  });

  it('espera el enfriamiento antes de volver a avisar', async () => {
    service.segundosParaReenviarAviso.mockResolvedValue(42);

    const resultado = await reenviarAvisoCierreCaja({
      id_caja: 'caja-1',
      solicitante: 'CajeroTest'
    });

    expect(resultado.avisado).toBe(false);
    expect(resultado.httpStatus).toBe(429);
    expect(resultado.esperarSegundos).toBe(42);
    expect(resultado.ultimoAvisoEn).toBe('2026-09-28 16:20:00');
    // Lo importante: no se manda nada y no se mueve el sello del último aviso.
    expect(whatsapp.enviarMensajeSolicitudCierreCaja).not.toHaveBeenCalled();
    expect(service.registrarAvisoCierre).not.toHaveBeenCalled();
  });

  it('reenvía la misma solicitud, con su token, y sella el último aviso', async () => {
    const resultado = await reenviarAvisoCierreCaja({
      id_caja: 'caja-1',
      solicitante: 'CajeroTest'
    });

    expect(resultado.avisado).toBe(true);
    expect(resultado.httpStatus).toBe(200);
    expect(resultado.ultimoAvisoEn).toBe('2026-09-28 16:35:00');

    expect(whatsapp.enviarMensajeSolicitudCierreCaja).toHaveBeenCalledOnce();
    const enviado = whatsapp.enviarMensajeSolicitudCierreCaja.mock.calls[0][0];
    expect(enviado.token).toBe('tok-1');
    expect(enviado.cajaId).toBe('caja-1');
    expect(enviado.reenvio).toBe(true);
    expect(enviado.cajeroNombre).toBe('CajeroTest');
    // El desglose es el de la solicitud: el descuento se recalcula al autorizar, no acá.
    expect(enviado.saldoClientes).toBe(12000);
    expect(enviado.montoCierre).toBe(160000);
    expect(enviado.motivo).toBe('Cierre de turno');
    expect(enviado.montoApertura).toBe(100000);

    // El detalle del turno viaja completo para que el admin decida sin abrir el dashboard.
    expect(enviado.ventas).toBe(78000);
    expect(enviado.servicios).toBe(40000);
    expect(enviado.propinas).toBe(9000);
    expect(enviado.comisiones).toBe(7000);
    expect(enviado.anticipos).toBe(2000);
    expect(enviado.iva).toBe(15000);
    expect(enviado.prepagoCargado).toBe(30000);
    expect(enviado.prepagoConsumido).toBe(18000);
    expect(enviado.prepagoPendienteClientes).toBe(12000);

    expect(service.registrarAvisoCierre).toHaveBeenCalledWith('tok-1');
  });

  it('usa el nombre de quien pidió el cierre, no el de quien reenvía', async () => {
    await reenviarAvisoCierreCaja({ id_caja: 'caja-1', solicitante: 'OtroUsuario' });

    expect(whatsapp.enviarMensajeSolicitudCierreCaja.mock.calls[0][0].cajeroNombre).toBe(
      'CajeroTest'
    );
  });

  it('si el WhatsApp falla, no consume el enfriamiento', async () => {
    whatsapp.enviarMensajeSolicitudCierreCaja.mockRejectedValue(new Error('Twilio caído'));

    const resultado = await reenviarAvisoCierreCaja({
      id_caja: 'caja-1',
      solicitante: 'CajeroTest'
    });

    expect(resultado.avisado).toBe(false);
    expect(resultado.httpStatus).toBe(202);
    // Sin sello no se sella: el cajero puede reintentar enseguida en vez de esperar un minuto.
    expect(service.registrarAvisoCierre).not.toHaveBeenCalled();
    expect(resultado.ultimoAvisoEn).toBe('2026-09-28 16:20:00');
  });

  it('si la caja ya no existe, no manda nada', async () => {
    service.getById.mockResolvedValue(null);

    const resultado = await reenviarAvisoCierreCaja({
      id_caja: 'caja-1',
      solicitante: 'CajeroTest'
    });

    expect(resultado.httpStatus).toBe(404);
    expect(whatsapp.enviarMensajeSolicitudCierreCaja).not.toHaveBeenCalled();
  });

  it('la respuesta lleva el sello y los segundos que faltan para el próximo reenvío', () => {
    expect(
      respuestaReenvioAviso({
        avisado: true,
        message: 'Aviso reenviado al administrador',
        httpStatus: 200,
        ultimoAvisoEn: '2026-09-28 16:35:00',
        esperarSegundos: 60
      })
    ).toEqual({
      success: true,
      message: 'Aviso reenviado al administrador',
      data: { ultimo_aviso_en: '2026-09-28 16:35:00', esperar_segundos: 60 }
    });
  });
});
