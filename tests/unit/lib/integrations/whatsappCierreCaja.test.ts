// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

/**
 * El módulo de WhatsApp arma el cliente de Twilio al importarse y lee el número del admin de
 * la base. Acá se prueban el texto del aviso y los datos que viajan, no el envío.
 */
vi.mock('twilio', () => ({ default: vi.fn() }));
vi.mock('@/lib/business/whatsappConfig', () => ({ getAdminWhatsApp: vi.fn() }));
// Sesión paralela: los datos de Twilio ahora se leen de la base, y ese módulo abre la
// conexión al importarse — acá solo se prueba el texto, no el envío.
vi.mock('@/lib/business/twilioConfig', () => ({
  getTwilioConfig: vi.fn().mockResolvedValue({
    accountSid: 'AC-test',
    authToken: 'token-test',
    whatsappNumber: '+14000000000'
  })
}));

import { construirMensajeSolicitudCierreCaja } from '@/lib/integrations/whatsappService';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

const DATOS = {
  cajaId: 'caja-1',
  cajeroNombre: 'CajeroTest',
  fechaApertura: '2026-09-29 12:00:00',
  montoApertura: 100000,
  efectivo: 50000,
  tarjeta: 20000,
  transferencia: 5000,
  devoluciones: 3000,
  retiroTotal: 7000,
  ventas: 78000,
  servicios: 40000,
  propinas: 9000,
  comisiones: 7000,
  anticipos: 2000,
  iva: 15000,
  prepagoCargado: 30000,
  prepagoConsumido: 18000,
  prepagoPendienteClientes: 12000,
  saldoClientes: 12000,
  montoCierre: 160000
};

/**
 * El aviso de cierre es lo que el administrador lee para decidir, así que tiene que llevar el
 * detalle del turno completo (movimiento, dinero en el cajón y prepago), no solo el desglose.
 */
describe('construirMensajeSolicitudCierreCaja', () => {
  it('lleva el detalle completo del turno, no solo el dinero del cajón', () => {
    const mensaje = construirMensajeSolicitudCierreCaja(DATOS);

    expect(mensaje).toContain('*Movimiento del turno*');
    expect(mensaje).toContain(`• Ventas: ${formatCurrencyCLP(78000)}`);
    expect(mensaje).toContain(`• Servicios: ${formatCurrencyCLP(40000)}`);
    expect(mensaje).toContain(`• Propinas: ${formatCurrencyCLP(9000)}`);
    expect(mensaje).toContain(`• Comisiones: ${formatCurrencyCLP(7000)}`);
    expect(mensaje).toContain(`• Anticipos: ${formatCurrencyCLP(2000)}`);
    expect(mensaje).toContain(`• IVA: ${formatCurrencyCLP(15000)}`);

    expect(mensaje).toContain('*Dinero en caja*');
    expect(mensaje).toContain(`• Apertura: ${formatCurrencyCLP(100000)}`);
    expect(mensaje).toContain(`• Efectivo: ${formatCurrencyCLP(50000)}`);
    expect(mensaje).toContain(`• Devoluciones: -${formatCurrencyCLP(3000)}`);
    expect(mensaje).toContain(
      `• Anticipos (ya descontados del efectivo): -${formatCurrencyCLP(2000)}`
    );
    expect(mensaje).toContain(
      `• Retiros (ya descontados del efectivo): -${formatCurrencyCLP(7000)}`
    );
    expect(mensaje).toContain(`• Saldos de clientes a descontar: -${formatCurrencyCLP(12000)}`);
    // Aclara que el efectivo ya viene neto, para que nadie los descueste dos veces.
    expect(mensaje).toContain('Efectivo es lo que queda en el cajón');

    expect(mensaje).toContain('*Prepago de clientes*');
    expect(mensaje).toContain(`• Cargado en el turno: ${formatCurrencyCLP(30000)}`);
    expect(mensaje).toContain(`• Consumido: ${formatCurrencyCLP(18000)}`);
    expect(mensaje).toContain(`• Pendiente de clientes: ${formatCurrencyCLP(12000)}`);

    expect(mensaje).toContain(`*Monto de cierre previsto:* ${formatCurrencyCLP(160000)}`);
  });

  it('marca el reenvío sin cambiar el detalle', () => {
    const primero = construirMensajeSolicitudCierreCaja(DATOS);
    const reenvio = construirMensajeSolicitudCierreCaja({ ...DATOS, reenvio: true });

    expect(primero).toContain('*CIERRE DE CAJA - PENDIENTE DE AUTORIZACION*');
    expect(reenvio).toContain('*CIERRE DE CAJA - PENDIENTE DE AUTORIZACION (REENVIO)*');
    // El detalle es idéntico: reenviar no recalcula nada.
    expect(reenvio.replace(' (REENVIO)', '')).toBe(primero);
  });

  it('arma el link de autorización con el token cuando hay baseUrl', () => {
    const mensaje = construirMensajeSolicitudCierreCaja({
      ...DATOS,
      token: 'tok-1',
      baseUrl: 'https://panel.test'
    });

    expect(mensaje).toContain('*Autorizar o rechazar el cierre:* https://panel.test');
    expect(mensaje).toContain('token=tok-1');
  });

  it('sin link explica cómo responder por WhatsApp', () => {
    const mensaje = construirMensajeSolicitudCierreCaja(DATOS);

    expect(mensaje).not.toContain('Autorizar o rechazar el cierre:');
    expect(mensaje).toContain('cierre si');
    expect(mensaje).toContain('cierre no');
  });

  it('sin montos del turno no rompe: los muestra en cero', () => {
    const mensaje = construirMensajeSolicitudCierreCaja({
      cajaId: 'caja-2',
      cajeroNombre: 'CajeroTest',
      fechaApertura: '2026-09-29 12:00:00',
      montoApertura: 100000,
      efectivo: 0,
      tarjeta: 0,
      transferencia: 0,
      devoluciones: 0,
      saldoClientes: 0,
      montoCierre: 100000
    });

    expect(mensaje).toContain(`• Ventas: ${formatCurrencyCLP(0)}`);
    expect(mensaje).toContain(`• Propinas: ${formatCurrencyCLP(0)}`);
    expect(mensaje).toContain(`• Pendiente de clientes: ${formatCurrencyCLP(0)}`);
  });
});
