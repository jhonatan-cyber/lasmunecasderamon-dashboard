import { describe, expect, it } from 'vitest';
import {
  isApprovalAction,
  normalizeWhatsAppMessage,
  parseCierreCajaCommand,
  parseSolicitudResponseCommand
} from '@/lib/integrations/whatsappCommandUtils';

/**
 * El webhook de WhatsApp resuelve el cierre de caja con estos parsers: un parseo
 * equivocado autorizaría o rechazaría un cierre que el administrador no pidió.
 */
describe('parseCierreCajaCommand', () => {
  it('autoriza con "cierre si" y rechaza con "cierre no", sin importar mayúsculas ni espacios', () => {
    expect(parseCierreCajaCommand(normalizeWhatsAppMessage('CIERRE SI'))).toEqual({
      action: 'autorizar'
    });
    expect(parseCierreCajaCommand(normalizeWhatsAppMessage('  cierre   si  '))).toEqual({
      action: 'autorizar'
    });
    expect(parseCierreCajaCommand(normalizeWhatsAppMessage('cierre no'))).toEqual({
      action: 'rechazar'
    });
  });

  it('acepta los sinónimos de la casa (confirmar/aprobar, rechazar)', () => {
    expect(parseCierreCajaCommand(normalizeWhatsAppMessage('cierre confirmar'))).toEqual({
      action: 'autorizar'
    });
    expect(parseCierreCajaCommand(normalizeWhatsAppMessage('cierre aprobar'))).toEqual({
      action: 'autorizar'
    });
    expect(parseCierreCajaCommand(normalizeWhatsAppMessage('cierre rechazar'))).toEqual({
      action: 'rechazar'
    });
  });

  it('no se apropia de un "SI" suelto: eso responde a la lista de anulaciones', () => {
    expect(parseCierreCajaCommand(normalizeWhatsAppMessage('si'))).toBeNull();
    expect(parseCierreCajaCommand(normalizeWhatsAppMessage('no'))).toBeNull();
    expect(parseCierreCajaCommand(normalizeWhatsAppMessage('1 si'))).toBeNull();
    expect(parseCierreCajaCommand(normalizeWhatsAppMessage('cierre'))).toBeNull();
  });

  it('el parser numerado sigue siendo sólo para anulaciones', () => {
    const respuesta = parseSolicitudResponseCommand(normalizeWhatsAppMessage('2 NO'));
    expect(respuesta).toEqual({ index: 1, action: 'no' });
    expect(isApprovalAction(respuesta!.action)).toBe(false);
  });
});
