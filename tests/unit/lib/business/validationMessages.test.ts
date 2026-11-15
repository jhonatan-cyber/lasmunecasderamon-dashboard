// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  VALIDATION_MESSAGES,
  montoSchema,
  idSchema,
  descripcionSchema,
  nombreSchema,
  runRefinement,
  phoneRefinement,
  emailRefinement,
  dateRefinement,
  ipv4Refinement
} from '@/lib/business/schemas/validationMessages';

describe('VALIDATION_MESSAGES', () => {
  it('debería tener mensajes de campos requeridos', () => {
    expect(VALIDATION_MESSAGES.required).toBe('El campo es requerido');
    expect(VALIDATION_MESSAGES.requiredField('Nombre')).toBe('Nombre es requerido');
  });

  it('debería formatear mensajes de longitud', () => {
    expect(VALIDATION_MESSAGES.min('Nombre', 3)).toBe('Nombre debe tener al menos 3 caracteres');
    expect(VALIDATION_MESSAGES.max('Email', 100)).toBe('Email no puede exceder 100 caracteres');
  });

  it('debería formatear mensajes numéricos', () => {
    expect(VALIDATION_MESSAGES.positive).toBe('El valor debe ser positivo');
    expect(VALIDATION_MESSAGES.positiveOrZero).toBe('El valor debe ser mayor o igual a cero');
    expect(VALIDATION_MESSAGES.decimalPlaces(2)).toBe('No puede tener más de 2 decimales');
  });

  it('debería formatear mensajes de arrays', () => {
    expect(VALIDATION_MESSAGES.minItems(1)).toBe('Debe haber al menos 1 elemento');
    expect(VALIDATION_MESSAGES.maxItems(10)).toBe('No puede haber más de 10 elementos');
  });
});

describe('montoSchema', () => {
  it('debería validar monto positivo como number', () => {
    const schema = montoSchema();
    const result = schema.safeParse(100);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(100);
  });

  it('debería validar monto como string', () => {
    const schema = montoSchema();
    const result = schema.safeParse('50.50');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(50.5);
  });

  it('debería rechazar monto negativo', () => {
    const schema = montoSchema();
    const result = schema.safeParse(-10);
    expect(result.success).toBe(false);
  });

  it('debería rechazar monto cero por defecto', () => {
    const schema = montoSchema();
    const result = schema.safeParse(0);
    expect(result.success).toBe(false);
  });

  it('debería aceptar cero cuando allowZero es true', () => {
    const schema = montoSchema({ allowZero: true });
    const result = schema.safeParse(0);
    expect(result.success).toBe(true);
  });

  it('debería rechazar monto mayor al máximo', () => {
    const schema = montoSchema({ max: 1000 });
    const result = schema.safeParse(1001);
    expect(result.success).toBe(false);
  });

  it('debería rechazar monto con más de 2 decimales', () => {
    const schema = montoSchema();
    const result = schema.safeParse(100.123);
    expect(result.success).toBe(false);
  });

  it('debería rechazar NaN', () => {
    const schema = montoSchema();
    const result = schema.safeParse(NaN);
    expect(result.success).toBe(false);
  });

  it('debería rechazar Infinity', () => {
    const schema = montoSchema();
    const result = schema.safeParse(Infinity);
    expect(result.success).toBe(false);
  });
});

describe('idSchema', () => {
  it('debería validar ID no vacío', () => {
    const schema = idSchema();
    const result = schema.safeParse('abc-123');
    expect(result.success).toBe(true);
  });

  it('debería rechazar ID vacío', () => {
    const schema = idSchema();
    const result = schema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('debería aceptar null cuando nullable es true', () => {
    const schema = idSchema({ nullable: true });
    const result = schema.safeParse(null);
    expect(result.success).toBe(true);
  });

  it('debería rechazar null cuando nullable es false', () => {
    const schema = idSchema({ nullable: false });
    const result = schema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it('debería usar label personalizado en el mensaje', () => {
    const schema = idSchema({ label: 'Serial' });
    const result = schema.safeParse('');
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = result.error.issues[0]?.message;
      expect(message).toContain('Serial');
    }
  });
});

describe('descripcionSchema', () => {
  it('debería validar descripción válida', () => {
    const schema = descripcionSchema();
    const result = schema.safeParse('Una descripción');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('Una descripción');
  });

  it('debería transformar null a undefined', () => {
    const schema = descripcionSchema();
    const result = schema.safeParse(null);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeUndefined();
  });

  it('debería rechazar descripción muy larga', () => {
    const schema = descripcionSchema(10);
    const result = schema.safeParse('Texto muy largo');
    expect(result.success).toBe(false);
  });
});

describe('nombreSchema', () => {
  it('debería validar nombre válido', () => {
    const schema = nombreSchema();
    const result = schema.safeParse('Juan Pérez');
    expect(result.success).toBe(true);
  });

  it('debería rechazar nombre vacío', () => {
    const schema = nombreSchema();
    const result = schema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('debería rechazar nombre muy largo', () => {
    const schema = nombreSchema({ max: 10 });
    const result = schema.safeParse('Nombre muy largo');
    expect(result.success).toBe(false);
  });
});

describe('runRefinement', () => {
  it('debería validar RUN válido', () => {
    expect(runRefinement('12345678-5')).toBe(true);
    expect(runRefinement('12.345.678-5')).toBe(true);
    expect(runRefinement('12345678-K')).toBe(true);
  });

  it('debería rechazar RUN inválido', () => {
    expect(runRefinement('12345678-12')).toBe(false);
    expect(runRefinement('abc-defg')).toBe(false);
    expect(runRefinement('')).toBe(false);
  });
});

describe('phoneRefinement', () => {
  it('debería validar teléfonos chilenos', () => {
    expect(phoneRefinement('+56912345678')).toBe(true);
    expect(phoneRefinement('56912345678')).toBe(true);
    expect(phoneRefinement('912345678')).toBe(true);
  });

  it('debería rechazar teléfonos inválidos', () => {
    expect(phoneRefinement('12345678')).toBe(false);
    expect(phoneRefinement('abc')).toBe(false);
    expect(phoneRefinement('')).toBe(false);
  });
});

describe('emailRefinement', () => {
  it('debería validar emails válidos', () => {
    expect(emailRefinement('test@example.com')).toBe(true);
    expect(emailRefinement('user.name@domain.org')).toBe(true);
  });

  it('debería rechazar emails inválidos', () => {
    expect(emailRefinement('not-an-email')).toBe(false);
    expect(emailRefinement('@domain.com')).toBe(false);
    expect(emailRefinement('user@')).toBe(false);
  });
});

describe('dateRefinement', () => {
  it('debería validar fechas válidas', () => {
    expect(dateRefinement('2025-01-15')).toBe(true);
    expect(dateRefinement('2026-12-31')).toBe(true);
  });

  it('debería rechazar fechas inválidas', () => {
    expect(dateRefinement('15-01-2025')).toBe(false);
    expect(dateRefinement('2025-13-01')).toBe(false);
    expect(dateRefinement('not-a-date')).toBe(false);
  });
});

describe('ipv4Refinement', () => {
  it('debería validar IPs válidas', () => {
    expect(ipv4Refinement('192.168.1.1')).toBe(true);
    expect(ipv4Refinement('10.0.0.1')).toBe(true);
    expect(ipv4Refinement('0.0.0.0')).toBe(true);
    expect(ipv4Refinement('255.255.255.255')).toBe(true);
  });

  it('debería rechazar IPs inválidas', () => {
    expect(ipv4Refinement('256.0.0.1')).toBe(false);
    expect(ipv4Refinement('999.999.999.999')).toBe(false);
    expect(ipv4Refinement('192.168.1')).toBe(false);
    expect(ipv4Refinement('not-an-ip')).toBe(false);
  });
});
