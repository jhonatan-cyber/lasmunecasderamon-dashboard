// @vitest-environment node
import { describe, expect, it } from 'vitest';

/**
 * Tests de la parte pura del puente facial: no tocan la DLL ni el equipo (eso
 * se probó contra el hardware real y se valida con `FACIAL_REAL=1` aparte).
 */
import {
  decidirCoincidencia,
  ERROR_NO_SOPORTADO,
  ERROR_PARAMETRO_ILEGAL,
  ERROR_SIN_CARA,
  escribirTextoUtf8,
  guardarCaraEnEquipo,
  mensajeDeCodigoFacial,
  similitudCoseno,
  UMBRAL_COINCIDENCIA_DEFECTO,
  umbralCoincidenciaFacial,
  vectorDesdeEigen
} from '@/lib/biometric/faceSdk';

describe('similitudCoseno', () => {
  it('da 1 para el mismo vector, 0 para ortogonales y -1 para opuestos', () => {
    expect(similitudCoseno(new Float32Array([1, 0, 0]), new Float32Array([1, 0, 0]))).toBeCloseTo(
      1,
      6
    );
    expect(similitudCoseno(new Float32Array([1, 0]), new Float32Array([0, 1]))).toBeCloseTo(0, 6);
    expect(similitudCoseno(new Float32Array([1, 0]), new Float32Array([-1, 0]))).toBeCloseTo(-1, 6);
  });

  it('devuelve 0 cuando no se pueden comparar', () => {
    expect(similitudCoseno(new Float32Array([]), new Float32Array([]))).toBe(0);
    expect(similitudCoseno(new Float32Array([1]), new Float32Array([1, 2]))).toBe(0);
    expect(similitudCoseno(new Float32Array([0, 0]), new Float32Array([1, 0]))).toBe(0);
  });
});

describe('vectorDesdeEigen', () => {
  it('interpreta los 1024 bytes little-endian que devuelve el equipo', () => {
    const original = new Float32Array([0.5, -0.25, 1, 0]);
    const bytes = Buffer.from(original.buffer.slice(0));
    const vector = vectorDesdeEigen(bytes);
    expect(Array.from(vector)).toEqual([0.5, -0.25, 1, 0]);
  });

  it('ignora un resto que no completa un float', () => {
    const bytes = Buffer.concat([
      Buffer.from(new Float32Array([0.25]).buffer),
      Buffer.from([9, 9])
    ]);
    expect(Array.from(vectorDesdeEigen(bytes))).toEqual([0.25]);
  });
});

describe('umbralCoincidenciaFacial', () => {
  it('usa 0.7 por defecto y descarta valores inválidos', () => {
    expect(umbralCoincidenciaFacial({})).toBe(UMBRAL_COINCIDENCIA_DEFECTO);
    expect(umbralCoincidenciaFacial({ BIOMETRIC_FACE_MATCH_THRESHOLD: 'abc' })).toBe(0.7);
    expect(umbralCoincidenciaFacial({ BIOMETRIC_FACE_MATCH_THRESHOLD: '1.5' })).toBe(0.7);
    expect(umbralCoincidenciaFacial({ BIOMETRIC_FACE_MATCH_THRESHOLD: '0' })).toBe(0.7);
  });

  it('respeta el valor configurado por entorno', () => {
    expect(umbralCoincidenciaFacial({ BIOMETRIC_FACE_MATCH_THRESHOLD: '0.85' })).toBe(0.85);
  });
});

describe('decidirCoincidencia', () => {
  it('compara la similitud contra el umbral (incluido el borde)', () => {
    expect(decidirCoincidencia(0.91, 0.7)).toBe(true);
    expect(decidirCoincidencia(0.7, 0.7)).toBe(true);
    expect(decidirCoincidencia(0.12, 0.7)).toBe(false);
  });
});

describe('mensajeDeCodigoFacial', () => {
  it('traduce los códigos conocidos del NetSDK', () => {
    expect(mensajeDeCodigoFacial(ERROR_SIN_CARA).motivo).toBe('sin_cara');
    expect(mensajeDeCodigoFacial(ERROR_PARAMETRO_ILEGAL).motivo).toBe('foto_invalida');
    expect(mensajeDeCodigoFacial(ERROR_NO_SOPORTADO).motivo).toBe('no_soportado');
  });

  it('muestra el código hexadecimal para errores desconocidos', () => {
    const r = mensajeDeCodigoFacial(0x80000999);
    expect(r.motivo).toBe('error_desconocido');
    expect(r.mensaje).toContain('0x80000999');
  });
});

describe('escribirTextoUtf8', () => {
  it('trunca antes de partir un carácter multibyte y deja el \\0 final', () => {
    // "José " ocupa 6 bytes; el espacio y la Á ya no entran en 8 bytes.
    const buffer = Buffer.alloc(8);
    escribirTextoUtf8(buffer, 0, 8, 'José Álvarez');
    expect(buffer.toString('utf8', 0, buffer.indexOf(0))).toBe('José ');
    expect(buffer[7]).toBe(0);
  });

  it('escribe el texto completo cuando entra en el campo', () => {
    const buffer = Buffer.alloc(64);
    escribirTextoUtf8(buffer, 32, 32, 'Sebastián');
    expect(buffer.toString('utf8', 32, 32 + Buffer.byteLength('Sebastián'))).toBe('Sebastián');
  });
});

describe('guardarCaraEnEquipo', () => {
  it('rechaza un vector vacío sin abrir sesión contra el equipo', async () => {
    await expect(
      guardarCaraEnEquipo(
        { ip: '10.0.0.9', usuario: 'admin', clave: 'x' },
        '1001',
        new Float32Array()
      )
    ).rejects.toMatchObject({ name: 'ErrorFacial', motivo: 'foto_invalida' });
  });
});
