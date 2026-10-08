import { describe, expect, it } from 'vitest';
import { normalizeWhatsAppPhone } from '@/lib/utils/whatsappPhone';

describe('normalizeWhatsAppPhone', () => {
  it('agrega el código boliviano a un número nacional de 8 dígitos', () => {
    expect(normalizeWhatsAppPhone('72419112')).toBe('+59172419112');
  });

  it('conserva números con prefijo internacional', () => {
    expect(normalizeWhatsAppPhone('+591 7241 9112')).toBe('+59172419112');
    expect(normalizeWhatsAppPhone('whatsapp:+1 (415) 555-2671')).toBe('+14155552671');
    expect(normalizeWhatsAppPhone('0059172419112')).toBe('+59172419112');
  });

  it('rechaza destinos con formato o longitud inválidos', () => {
    expect(() => normalizeWhatsAppPhone('1234')).toThrow('Número de destino inválido');
    expect(() => normalizeWhatsAppPhone('abc')).toThrow('Número de destino inválido');
  });
});
