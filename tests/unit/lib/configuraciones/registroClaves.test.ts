import { describe, expect, it } from 'vitest';
import {
  CLAVES_CONFIG,
  REGISTRO_CLAVES,
  aliasDeClave,
  categoriaDeClave,
  defaultDeClave,
  definicionDe,
  esClaveConfigValida,
  validarConfig
} from '@/modules/configuracion/contracts';

/**
 * El registro es la lista única de claves guardables: de él salen la allowlist y los
 * mensajes del endpoint, la categoría con la que se inserta la fila y los defaults que
 * abren los formularios. Estos tests fijan las tres cosas, porque el modo de falla de esta
 * pieza no es que se caiga: es que una clave quede con regla pero sin categoría (se
 * guarda donde nadie la lee) o con un default que el servidor no comparte.
 */
describe('registro de claves de configuración', () => {
  it('cada clave declara categoría, tipo y default', () => {
    for (const [clave, definicion] of Object.entries(REGISTRO_CLAVES)) {
      expect(definicion.categoria, `${clave} sin categoría`).toBeTruthy();
      expect(['number', 'boolean', 'text'], `${clave} con tipo raro`).toContain(definicion.tipo);
      expect(definicion.default, `${clave} sin default`).not.toBeUndefined();
    }
  });

  it('expone la lista de claves y la validación de existencia', () => {
    expect(CLAVES_CONFIG).toContain('shot_ml');
    expect(esClaveConfigValida('botella_ml')).toBe(true);
    expect(esClaveConfigValida('inventada')).toBe(false);
    // Una clave heredada por prototype no debe pasar por válida.
    expect(esClaveConfigValida('constructor')).toBe(false);
    expect(esClaveConfigValida('toString')).toBe(false);
    expect(definicionDe('constructor')).toBeUndefined();
  });

  it('las claves de facturación están en su propia categoría, no en empresa', () => {
    // El endpoint antes guardaba impuesto_iva, moneda, ambiente y timezone bajo `empresa`
    // mientras el volcado base las deja en `facturacion` y `sistema`: nadie encontraba lo
    // recién guardado y el IVA volvía a su default en cada pantalla.
    for (const clave of ['impuesto_iva', 'propina_venta', 'moneda', 'facturacion_activada']) {
      expect(categoriaDeClave(clave), `${clave} mal categorizada`).toBe('facturacion');
    }
    expect(categoriaDeClave('ambiente')).toBe('sistema');
    expect(categoriaDeClave('timezone')).toBe('sistema');
    expect(categoriaDeClave('empresa_nombre')).toBe('empresa');
    expect(categoriaDeClave('shot_ml')).toBe('bar');
    expect(categoriaDeClave('umbral_simple_hasta')).toBe('comisiones');
    expect(categoriaDeClave('asistencia_hora_inicio')).toBe('asistencia');
    expect(categoriaDeClave('twilio_auth_token')).toBe('integraciones');
  });

  it('los defaults son los que usaba el código antes del registro', () => {
    // Estos números se repetían literal por literal en componentes y hooks.
    expect(defaultDeClave('shot_ml')).toBe(50);
    expect(defaultDeClave('botella_ml')).toBe(750);
    expect(defaultDeClave('shots_alerta')).toBe(3);
    expect(defaultDeClave('propina_venta')).toBe(10);
    expect(defaultDeClave('split_tarjeta_venta')).toBe(51);
    expect(defaultDeClave('split_tarjeta_propina')).toBe(49);
    expect(defaultDeClave('moneda')).toBe('CLP');
    expect(defaultDeClave('clave_inexistente')).toBeUndefined();
  });

  it('el alias deprecado de los umbrales es mutuo', () => {
    // Guardar cualquiera de las dos tiene que sincronizar la otra.
    expect(aliasDeClave('threshold_producto_caro')).toBe('umbral_habitacion_desde');
    expect(aliasDeClave('umbral_habitacion_desde')).toBe('threshold_producto_caro');
    expect(aliasDeClave('umbral_simple_hasta')).toBeUndefined();
  });

  describe('validación', () => {
    it('rechaza una clave desconocida', () => {
      expect(validarConfig('clave_inventada', '1')).toBe('Clave desconocida: clave_inventada');
    });

    it('acepta valores válidos', () => {
      expect(validarConfig('impuesto_iva', '19')).toBeNull();
      expect(validarConfig('propina_venta', '0')).toBeNull();
      expect(validarConfig('asistencia_hora_fin', '23')).toBeNull();
      expect(validarConfig('umbral_simple_hasta', '0')).toBeNull();
      expect(validarConfig('shot_ml', '50')).toBeNull();
      expect(validarConfig('botella_ml', '1000')).toBeNull();
      expect(validarConfig('shots_alerta', '3')).toBeNull();
      expect(validarConfig('moneda', 'CLP')).toBeNull();
      expect(validarConfig('empresa_nombre', 'cualquier texto')).toBeNull();
    });

    it('mantiene los mensajes que el endpoint ya devolvía', () => {
      // Son contrato con los formularios, que los muestran tal cual.
      expect(validarConfig('impuesto_iva', '120')).toBe('impuesto_iva debe estar entre 0 y 100');
      expect(validarConfig('asistencia_hora_inicio', '25')).toBe(
        'asistencia_hora_inicio debe ser una hora válida entre 0 y 23'
      );
      expect(validarConfig('split_tarjeta_venta', '1.5')).toBe(
        'split_tarjeta_venta debe ser un número entero positivo'
      );
      expect(validarConfig('shot_ml', '0')).toBe(
        'shot_ml debe ser un número entero entre 1 y 1000 (ml por shot)'
      );
      expect(validarConfig('botella_ml', '10001')).toBe(
        'botella_ml debe ser un número entero entre 1 y 10000 (ml por botella)'
      );
      expect(validarConfig('shots_alerta', '51')).toBe(
        'shots_alerta debe ser un número entero entre 1 y 50 (shots restantes)'
      );
      expect(validarConfig('admin_whatsapp', 'no-es-un-numero')).toBe(
        'admin_whatsapp debe ser un número válido (ej: 59172419112)'
      );
      expect(validarConfig('twilio_account_sid', 'xx')).toBe(
        'twilio_account_sid debe ser un Account SID de Twilio (empieza con AC y tiene 32 caracteres)'
      );
      expect(validarConfig('twilio_auth_token', 'corto')).toBe(
        'twilio_auth_token debe ser un Auth Token válido de Twilio (mínimo 16 caracteres)'
      );
      expect(validarConfig('twilio_whatsapp_number', 'no-es-un-numero')).toBe(
        'twilio_whatsapp_number debe ser un número válido (ej: whatsapp:+14155238886)'
      );
    });

    it('una credencial de Twilio vacía es válida: cae a la variable de entorno', () => {
      expect(validarConfig('twilio_account_sid', '')).toBeNull();
      expect(validarConfig('twilio_auth_token', '')).toBeNull();
      expect(validarConfig('twilio_whatsapp_number', '')).toBeNull();
      expect(validarConfig('admin_whatsapp', '')).toBeNull();
    });
  });
});
