import { describe, expect, it } from 'vitest';
import { escaparHtml } from '@/lib/utils/htmlEscape';

/**
 * Estos documentos se imprimen en ventanas que heredan el origen del opener
 * (`window.open('', '_blank')`) o en Blob URLs, así que un `<` sin escapar es
 * ejecución same-origin, no un problema de maquetación.
 */
describe('escaparHtml', () => {
  it('reemplaza los cinco caracteres que pueden abrir markup', () => {
    expect(escaparHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });

  it('deja intacto el texto sin caracteres especiales', () => {
    expect(escaparHtml('Ana Pérez 12')).toBe('Ana Pérez 12');
  });

  it('escapa el ampersand una sola vez, sin doble escape', () => {
    // Si el ampersand no se escapara primero, `&lt;` sobreviviría como entidad
    // y volvería a convertirse en `<` al interpretar el HTML.
    expect(escaparHtml('&lt;')).toBe('&amp;lt;');
  });

  it('neutraliza un intento de inyección de atributo', () => {
    const escapado = escaparHtml('x" onerror="alert(1)');

    expect(escapado).not.toContain('"');
    expect(escapado).toContain('&quot;');
  });

  it('trata null y undefined como texto vacío para no romper la impresión', () => {
    expect(escaparHtml(null)).toBe('');
    expect(escaparHtml(undefined)).toBe('');
  });
});
