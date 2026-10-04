// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cifrarSecreto,
  descifrarSecreto,
  generarClaveCifrado
} from '@/modules/asistencia/biometrico/credencialesCrypto';

/**
 * Tests del cifrado de credenciales con la clave real generada en el test
 * (crypto nativo, sin mocks): round-trip, formato y validación de la clave.
 */

const CLAVE = generarClaveCifrado();

beforeEach(() => {
  process.env.BIOMETRIC_ENCRYPTION_KEY = CLAVE;
});

afterEach(() => {
  delete process.env.BIOMETRIC_ENCRYPTION_KEY;
});

describe('credencialesCrypto', () => {
  it('genera claves de 32 bytes en base64', () => {
    const clave = generarClaveCifrado();
    expect(Buffer.from(clave, 'base64').length).toBe(32);
  });

  it('round-trip: descifrar(cifrar(x)) === x', () => {
    const secreto = 'ClaveDelLector-2026!';
    const cifrado = cifrarSecreto(secreto);

    expect(cifrado).not.toContain(secreto);
    expect(descifrarSecreto(cifrado)).toBe(secreto);
  });

  it('formato iv.tag.datos y IV de 12 bytes', () => {
    const partes = cifrarSecreto('hola').split('.');
    expect(partes.length).toBe(3);
    expect(Buffer.from(partes[0], 'base64').length).toBe(12);
    expect(Buffer.from(partes[1], 'base64').length).toBe(16); // tag GCM
  });

  it('dos cifrados del mismo texto difieren (IV aleatorio)', () => {
    expect(cifrarSecreto('mismo')).not.toBe(cifrarSecreto('mismo'));
  });

  it('sin BIOMETRIC_ENCRYPTION_KEY el módulo reimportado falla claro', async () => {
    delete process.env.BIOMETRIC_ENCRYPTION_KEY;
    vi.resetModules();
    const mod = await import('@/modules/asistencia/biometrico/credencialesCrypto');
    expect(() => mod.cifrarSecreto('x')).toThrow('BIOMETRIC_ENCRYPTION_KEY');
  });

  it('clave con tamaño incorrecto falla', async () => {
    process.env.BIOMETRIC_ENCRYPTION_KEY = Buffer.from('corta').toString('base64');
    vi.resetModules();
    const mod = await import('@/modules/asistencia/biometrico/credencialesCrypto');
    expect(() => mod.cifrarSecreto('x')).toThrow('32 bytes');
  });

  it('texto manipulado falla la autenticación GCM', () => {
    const cifrado = cifrarSecreto('integridad');
    const partes = cifrado.split('.');
    partes[2] = Buffer.from('manipulado').toString('base64');
    expect(() => descifrarSecreto(partes.join('.'))).toThrow();
  });
});
