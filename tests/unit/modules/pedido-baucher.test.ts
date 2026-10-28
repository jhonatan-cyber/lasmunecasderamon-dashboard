import { describe, expect, it } from 'vitest';
import { OrderCreateSchema } from '@/lib/business/schemas/order';

/**
 * La foto del baucher es la única constancia de que un pago con transferencia
 * entró. La app la saca con la cámara y el dashboard la adjunta; ambos la mandan
 * como data URL dentro del payload y `OrderRepository.create` la guarda en
 * `public/img/orders`.
 *
 * El esquema la exige con transferencia: un pedido sin foto se rechaza con 400,
 * venga de la pantalla que venga.
 */
const PEDIDO = {
  codigo: 'ABC12345',
  meseroId: 'u-garzon',
  metodoPago: 'transferencia',
  clienteId: null,
  subtotal: 5000,
  total: 5000,
  propina: 0,
  totalComision: 0,
  detalles: [
    {
      productoId: 'prod-1',
      precio: 5000,
      comision: 0,
      cantidad: 1,
      subtotal: 5000,
      selectedHostesses: []
    }
  ]
};

const BAUCHER = 'data:image/jpeg;base64,SG9sYSBidWFjaGVy';

describe('Foto del baucher de un pedido con transferencia', () => {
  it('rechaza la transferencia sin foto con un mensaje del baucher', () => {
    const resultado = OrderCreateSchema.safeParse(PEDIDO);

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues.map(issue => issue.message)).toContain(
      'El pago con transferencia necesita la foto del baucher'
    );
  });

  it('acepta transferencia cuando la foto viene como data URL', () => {
    expect(OrderCreateSchema.safeParse({ ...PEDIDO, baucher_foto: BAUCHER }).success).toBe(true);
  });

  it.each(['efectivo', 'tarjeta'])('%s no necesita foto del baucher', metodoPago => {
    expect(OrderCreateSchema.safeParse({ ...PEDIDO, metodoPago }).success).toBe(true);
  });

  it.each([
    ['una URL en lugar de la imagen', 'https://cdn.example.com/baucher.jpg'],
    ['texto plano', 'baucher'],
    ['un data URL que no es imagen', 'data:application/pdf;base64,SG9sYQ'],
    ['una cadena gigante', `data:image/jpeg;base64,${'A'.repeat(4_000_001)}`]
  ])('rechaza %s', (_label, baucher_foto) => {
    expect(OrderCreateSchema.safeParse({ ...PEDIDO, baucher_foto }).success).toBe(false);
  });
});
