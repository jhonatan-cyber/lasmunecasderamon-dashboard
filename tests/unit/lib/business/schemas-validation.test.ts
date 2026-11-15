// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  GratificacionCreateSchema,
  GratificacionUpdateSchema,
  BiometricDeviceCreateSchema,
  BiometricReceptionUpdateSchema,
  PermissionCreateSchema,
  PermissionUpdateSchema,
  ColacionCreateSchema
} from '@/lib/business/schemas';

describe('GratificacionCreateSchema', () => {
  it('debería validar datos correctos', () => {
    const result = GratificacionCreateSchema.safeParse({
      usuario_id: '123',
      monto: 100,
      descripcion: 'Buen trabajo'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.monto).toBe(100);
      expect(result.data.descripcion).toBe('Buen trabajo');
    }
  });

  it('debería aceptar monto como string', () => {
    const result = GratificacionCreateSchema.safeParse({
      usuario_id: '123',
      monto: '50.50'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.monto).toBe(50.5);
    }
  });

  it('debería rechazar monto negativo', () => {
    const result = GratificacionCreateSchema.safeParse({
      usuario_id: '123',
      monto: -50
    });
    expect(result.success).toBe(false);
  });

  it('debería rechazar monto cero', () => {
    const result = GratificacionCreateSchema.safeParse({
      usuario_id: '123',
      monto: 0
    });
    expect(result.success).toBe(false);
  });

  it('debería rechazar usuario_id vacío', () => {
    const result = GratificacionCreateSchema.safeParse({
      usuario_id: '',
      monto: 100
    });
    expect(result.success).toBe(false);
  });

  it('debería transformar descripcion null a undefined', () => {
    const result = GratificacionCreateSchema.safeParse({
      usuario_id: '123',
      monto: 100,
      descripcion: null
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.descripcion).toBeUndefined();
    }
  });

  it('debería rechazar monto mayor a 1,000,000', () => {
    const result = GratificacionCreateSchema.safeParse({
      usuario_id: '123',
      monto: 1000001
    });
    expect(result.success).toBe(false);
  });

  it('debería rechazar monto con más de 2 decimales', () => {
    const result = GratificacionCreateSchema.safeParse({
      usuario_id: '123',
      monto: 100.123
    });
    expect(result.success).toBe(false);
  });
});

describe('GratificacionUpdateSchema', () => {
  it('debería validar monto positivo', () => {
    const result = GratificacionUpdateSchema.safeParse({ monto: 200 });
    expect(result.success).toBe(true);
  });

  it('debería rechazar monto negativo', () => {
    const result = GratificacionUpdateSchema.safeParse({ monto: -10 });
    expect(result.success).toBe(false);
  });
});

describe('BiometricDeviceCreateSchema', () => {
  it('debería validar datos correctos', () => {
    const result = BiometricDeviceCreateSchema.safeParse({
      nombre: 'Dispositivo principal',
      marca: 'zkteco',
      serial: 'SN123456',
      ip: '192.168.1.100'
    });
    expect(result.success).toBe(true);
  });

  it('debería validar marca dahua', () => {
    const result = BiometricDeviceCreateSchema.safeParse({
      nombre: 'Dispositivo',
      marca: 'dahua',
      serial: 'SN789'
    });
    expect(result.success).toBe(true);
  });

  it('debería rechazar marca inválida', () => {
    const result = BiometricDeviceCreateSchema.safeParse({
      nombre: 'Dispositivo',
      marca: 'honeywell',
      serial: 'SN789'
    });
    expect(result.success).toBe(false);
  });

  it('debería rechazar nombre vacío', () => {
    const result = BiometricDeviceCreateSchema.safeParse({
      nombre: '',
      marca: 'zkteco',
      serial: 'SN789'
    });
    expect(result.success).toBe(false);
  });

  it('debería rechazar serial vacío', () => {
    const result = BiometricDeviceCreateSchema.safeParse({
      nombre: 'Dispositivo',
      marca: 'zkteco',
      serial: ''
    });
    expect(result.success).toBe(false);
  });

  it('debería rechazar IP inválida', () => {
    const result = BiometricDeviceCreateSchema.safeParse({
      nombre: 'Dispositivo',
      marca: 'zkteco',
      serial: 'SN789',
      ip: '999.999.999.999'
    });
    expect(result.success).toBe(false);
  });

  it('debería aceptar IP nula', () => {
    const result = BiometricDeviceCreateSchema.safeParse({
      nombre: 'Dispositivo',
      marca: 'zkteco',
      serial: 'SN789',
      ip: null
    });
    expect(result.success).toBe(true);
  });

  it('debería transformar modelo null a undefined', () => {
    const result = BiometricDeviceCreateSchema.safeParse({
      nombre: 'Dispositivo',
      marca: 'zkteco',
      serial: 'SN789',
      modelo: null
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.modelo).toBeUndefined();
    }
  });
});

describe('BiometricReceptionUpdateSchema', () => {
  it('debería validar booleano true', () => {
    const result = BiometricReceptionUpdateSchema.safeParse({ habilitado: true });
    expect(result.success).toBe(true);
  });

  it('debería validar booleano false', () => {
    const result = BiometricReceptionUpdateSchema.safeParse({ habilitado: false });
    expect(result.success).toBe(true);
  });

  it('debería rechazar string', () => {
    const result = BiometricReceptionUpdateSchema.safeParse({ habilitado: 'true' });
    expect(result.success).toBe(false);
  });
});

describe('PermissionCreateSchema', () => {
  it('debería validar datos correctos', () => {
    const result = PermissionCreateSchema.safeParse({
      name: 'Leer ventas',
      module: 'sales',
      action: 'read'
    });
    expect(result.success).toBe(true);
  });

  it('debería aceptar con descripción', () => {
    const result = PermissionCreateSchema.safeParse({
      name: 'Leer ventas',
      module: 'sales',
      action: 'read',
      description: 'Permite ver las ventas'
    });
    expect(result.success).toBe(true);
  });

  it('debería rechazar nombre vacío', () => {
    const result = PermissionCreateSchema.safeParse({
      name: '',
      module: 'sales',
      action: 'read'
    });
    expect(result.success).toBe(false);
  });

  it('debería rechazar módulo vacío', () => {
    const result = PermissionCreateSchema.safeParse({
      name: 'Permiso',
      module: '',
      action: 'read'
    });
    expect(result.success).toBe(false);
  });

  it('debería rechazar acción vacía', () => {
    const result = PermissionCreateSchema.safeParse({
      name: 'Permiso',
      module: 'sales',
      action: ''
    });
    expect(result.success).toBe(false);
  });
});

describe('PermissionUpdateSchema', () => {
  it('debería validar actualización parcial', () => {
    const result = PermissionUpdateSchema.safeParse({ name: 'Nuevo nombre' });
    expect(result.success).toBe(true);
  });

  it('debería rechazar objeto vacío', () => {
    const result = PermissionUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('ColacionCreateSchema', () => {
  it('debería validar datos correctos', () => {
    const result = ColacionCreateSchema.safeParse({
      usuario_id: 'user-1',
      presentacion_id: 'pres-1'
    });
    expect(result.success).toBe(true);
  });

  it('debería validar con acompañamiento', () => {
    const result = ColacionCreateSchema.safeParse({
      usuario_id: 'user-1',
      presentacion_id: 'pres-1',
      acompanamiento: 'gaseosa'
    });
    expect(result.success).toBe(true);
  });

  it('debería rechazar usuario_id vacío', () => {
    const result = ColacionCreateSchema.safeParse({
      usuario_id: '',
      presentacion_id: 'pres-1'
    });
    expect(result.success).toBe(false);
  });

  it('debería rechazar presentacion_id vacío', () => {
    const result = ColacionCreateSchema.safeParse({
      usuario_id: 'user-1',
      presentacion_id: ''
    });
    expect(result.success).toBe(false);
  });

  it('debería rechazar acompañamiento inválido', () => {
    const result = ColacionCreateSchema.safeParse({
      usuario_id: 'user-1',
      presentacion_id: 'pres-1',
      acompanamiento: 'agua'
    });
    expect(result.success).toBe(false);
  });
});
