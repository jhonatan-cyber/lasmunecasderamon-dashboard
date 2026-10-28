import { describe, expect, it } from 'vitest';
import { generateReceiptHTML } from '@/components/private-rooms/utils/PrivateRoomReceipt';

const base = {
  logoUrl: '/img/system/logo2.png',
  clienteNombre: 'Ana Pérez',
  habitacionNombre: 'Sala 1',
  metodoPago: 'efectivo',
  fecha: '01/10/2026 20:00',
  anfitrionasAtendiendo: 'Rosa',
  monto: 15000
};

/**
 * La boleta se abre con `window.open('', '_blank')`, que hereda el origen del
 * opener. Un nombre de cliente cargado por recepción no puede convertirse en
 * markup ejecutable dentro de esa ventana.
 */
describe('PrivateRoomReceipt · escape de los datos de la atención', () => {
  it('escapa el nombre del cliente', () => {
    const html = generateReceiptHTML({
      ...base,
      clienteNombre: '<img src=x onerror="alert(1)">'
    });

    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  });

  it('escapa la habitación, el método de pago y las anfitrionas', () => {
    const html = generateReceiptHTML({
      ...base,
      habitacionNombre: '<b>Sala 2</b>',
      metodoPago: '<script>alert(1)</script>',
      anfitrionasAtendiendo: 'Rosa & <i>Ana</i>'
    });

    expect(html).not.toContain('<b>Sala 2</b>');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<i>Ana</i>');
    expect(html).toContain('&lt;b&gt;Sala 2&lt;/b&gt;');
    expect(html).toContain('Rosa &amp; &lt;i&gt;Ana&lt;/i&gt;');
  });

  it('no deja cerrar el atributo src del logo', () => {
    const html = generateReceiptHTML({
      ...base,
      logoUrl: 'x" onerror="alert(1)'
    });

    expect(html).not.toContain('onerror="alert(1)"');
    expect(html).toContain('src="x&quot; onerror=&quot;alert(1)"');
  });

  it('mantiene el texto plano y el monto formateado', () => {
    const html = generateReceiptHTML(base);

    expect(html).toContain('Ana Pérez');
    expect(html).toContain('$15.000');
  });
});
