// @vitest-environment node
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

/**
 * Contrato de plataforma del cargador único del NetSDK: el nombre de la
 * librería y la carpeta por defecto cambian entre Windows y Linux, y la
 * carpeta tiene que quedar visible para el cargador dinámico del sistema
 * (`PATH` en Windows, `PATH` y `LD_LIBRARY_PATH` en Linux).
 */

vi.mock('koffi', () => ({
  default: { address: () => 42 }
}));

import {
  NOMBRE_LIBRERIA,
  carpetaSdk,
  direccionDe,
  prepararEntornoNativo,
  rutaLibreria
} from '@/modules/asistencia/biometrico/netSdk';

const ES_WINDOWS = process.platform === 'win32';

/** ProcessEnv de mentira para las pruebas (Next exige NODE_ENV en el tipo). */
function env(extra: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return { NODE_ENV: 'test', ...extra };
}

describe('nombre de la librería nativa', () => {
  it('usa la extensión propia de cada plataforma', () => {
    expect(NOMBRE_LIBRERIA).toBe(ES_WINDOWS ? 'dhnetsdk.dll' : 'libdhnetsdk.so');
  });

  it('rutaLibreria apunta a esa librería dentro de la carpeta', () => {
    expect(rutaLibreria(env({ DAHUA_SDK_DIR: '/opt/sdk' }))).toBe(
      path.join('/opt/sdk', NOMBRE_LIBRERIA)
    );
  });
});

describe('carpetaSdk', () => {
  it('lee DAHUA_SDK_DIR y le saca los espacios de sobra', () => {
    expect(carpetaSdk(env({ DAHUA_SDK_DIR: '  /opt/mi sdk  ' }))).toBe('/opt/mi sdk');
  });

  it('una DAHUA_SDK_DIR vacía o en blanco cae en la instalación por defecto', () => {
    expect(carpetaSdk(env({ DAHUA_SDK_DIR: '   ' }))).toBe(carpetaSdk(env({})));
    expect(carpetaSdk(env({}))).toBe(
      ES_WINDOWS ? 'C:\\Program Files\\SmartPSSLite' : '/opt/SmartPSSLite'
    );
    expect(carpetaSdk(env({}))).toContain('SmartPSSLite');
  });
});

describe('prepararEntornoNativo', () => {
  it('suma la carpeta a PATH una sola vez', () => {
    const entorno = env({ PATH: '/usr/bin', DAHUA_SDK_DIR: '/opt/sdk' });

    prepararEntornoNativo(entorno);
    expect(entorno.PATH).toBe(`/usr/bin${path.delimiter}/opt/sdk`);

    prepararEntornoNativo(entorno);
    expect(entorno.PATH).toBe(`/usr/bin${path.delimiter}/opt/sdk`);
  });

  it('arma PATH desde cero si el proceso no lo tenía', () => {
    const entorno = env({ DAHUA_SDK_DIR: '/opt/sdk' });

    prepararEntornoNativo(entorno);

    expect(entorno.PATH).toBe(`${path.delimiter}/opt/sdk`);
  });

  it('en Linux suma también LD_LIBRARY_PATH, donde dlopen busca las dependencias', () => {
    const entorno = env({
      PATH: '/usr/bin',
      LD_LIBRARY_PATH: '/usr/local/lib',
      DAHUA_SDK_DIR: '/opt/sdk'
    });

    prepararEntornoNativo(entorno);

    if (ES_WINDOWS) {
      expect(entorno.LD_LIBRARY_PATH).toBe('/usr/local/lib');
    } else {
      expect(entorno.LD_LIBRARY_PATH).toBe(`/usr/local/lib${path.delimiter}/opt/sdk`);
      prepararEntornoNativo(entorno);
      expect(entorno.LD_LIBRARY_PATH).toBe(`/usr/local/lib${path.delimiter}/opt/sdk`);
    }
  });
});

describe('direccionDe', () => {
  it('devuelve la dirección koffi como bigint para los structs del SDK', async () => {
    expect(await direccionDe(Buffer.alloc(4))).toBe(42n);
  });
});
