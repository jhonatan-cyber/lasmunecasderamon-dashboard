// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  sanitizeNullBytes,
  sanitizeMaxLength,
  sanitizeBody,
  detectSQLInjection,
  scanForSQLInjection
} from '@/lib/api/sanitize';

describe('sanitizeNullBytes', () => {
  it('debería eliminar null bytes', () => {
    expect(sanitizeNullBytes('hello\0world')).toBe('helloworld');
  });

  it('debería dejar texto sin null bytes', () => {
    expect(sanitizeNullBytes('hello world')).toBe('hello world');
  });
});

describe('sanitizeMaxLength', () => {
  it('debería recortar strings largos', () => {
    const long = 'a'.repeat(100);
    expect(sanitizeMaxLength(long, 10).length).toBe(10);
  });

  it('debería dejar strings cortos', () => {
    expect(sanitizeMaxLength('short', 100)).toBe('short');
  });
});

describe('sanitizeBody', () => {
  it('debería sanitizar strings', () => {
    const result = sanitizeBody('hello\0world');
    expect(result).toBe('helloworld');
  });

  it('debería sanitizar objetos recursivamente', () => {
    const obj = { name: 'test\0value', nested: { key: '<script>' } };
    const result = sanitizeBody(obj) as any;
    expect(result.name).toBe('testvalue');
    // sanitizeBody elimina null bytes y XSS en claves, pero no en valores
    // (los valores se validan con Zod schemas, no con sanitizeBody)
    expect(result.nested.key).toBe('<script>');
  });

  it('debería sanitizar arrays', () => {
    const arr = ['a\0b', 'c\0d'];
    const result = sanitizeBody(arr) as string[];
    expect(result).toEqual(['ab', 'cd']);
  });

  it('debería manejar null y undefined', () => {
    expect(sanitizeBody(null)).toBeNull();
    expect(sanitizeBody(undefined)).toBeUndefined();
  });

  it('debería respetar maxDepth', () => {
    const deep = { a: { b: { c: { d: 'deep' } } } };
    const result = sanitizeBody(deep, 3) as any;
    expect(result.a.b.c).toBe('[MAX_DEPTH]');
  });
});

describe('detectSQLInjection', () => {
  it('debería detectar SELECT', () => {
    expect(detectSQLInjection('SELECT * FROM users')).toBe(true);
  });

  it('debería detectar DROP', () => {
    expect(detectSQLInjection('DROP TABLE users')).toBe(true);
  });

  it('debería detectar OR 1=1', () => {
    expect(detectSQLInjection("' OR 1=1--")).toBe(true);
  });

  it('debería detectar UNION', () => {
    expect(detectSQLInjection('1 UNION SELECT')).toBe(true);
  });

  it('debería detectar SLEEP', () => {
    expect(detectSQLInjection('1; SLEEP(5)')).toBe(true);
  });

  it('debería pasar texto normal', () => {
    expect(detectSQLInjection('Hola mundo')).toBe(false);
    expect(detectSQLInjection('Producto de venta')).toBe(false);
  });
});

describe('scanForSQLInjection', () => {
  it('debería encontrar inyección en string', () => {
    const result = scanForSQLInjection('SELECT * FROM users');
    expect(result).toContain('root');
  });

  it('debería encontrar inyección en objeto', () => {
    const obj = { name: 'test', query: 'DROP TABLE' };
    const result = scanForSQLInjection(obj);
    expect(result).toContain('query');
  });

  it('debería encontrar inyección en array', () => {
    const arr = ['safe', 'DELETE FROM users'];
    const result = scanForSQLInjection(arr);
    expect(result).toContain('[1]');
  });

  it('debería retornar vacío para datos seguros', () => {
    const obj = { name: 'Juan', age: 30 };
    const result = scanForSQLInjection(obj);
    expect(result).toHaveLength(0);
  });
});
