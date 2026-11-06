import { describe, expect, it } from 'vitest';
import { SaleCreateSchema } from '@/lib/business/schemas/sale';

/**
 * La foto del baucher es la constancia de un pago con transferencia. El
 * formulario de nueva venta del dashboard la exige en ese caso, pero el esquema
 * —que también consume la app móvil, que aún cobra transferencias sin foto— la
 * admite como opcional: acá se valida la forma de la imagen, no su obligación.
 */
const VENTA = {
  total: 15000,
  sub_total: 15000,
  metodo_pago: 'transferencia',
  detalles: [{ producto_id: 'prod-1', precio: 15000, cantidad: 1, comision: 0 }],
  usuarios: []
};

const BAUCHER = 'data:image/jpeg;base64,SG9sYSBidWFjaGVy';

describe('Foto del baucher en una venta', () => {
  it('acepta la transferencia con la foto en data URL', () => {
    expect(SaleCreateSchema.safeParse({ ...VENTA, baucher_foto: BAUCHER }).success).toBe(true);
  });

  it.each(['efectivo', 'tarjeta', 'transferencia'])(
    '%s se acepta sin foto (el esquema no la exige)',
    metodo_pago => {
      expect(SaleCreateSchema.safeParse({ ...VENTA, metodo_pago }).success).toBe(true);
    }
  );

  it.each([
    ['una URL en lugar de la imagen', 'https://cdn.example.com/baucher.jpg'],
    ['texto plano', 'baucher'],
    ['un data URL que no es imagen', 'data:application/pdf;base64,SG9sYQ'],
    ['una cadena gigante', `data:image/jpeg;base64,${'A'.repeat(4_000_001)}`]
  ])('rechaza %s', (_label, baucher_foto) => {
    expect(SaleCreateSchema.safeParse({ ...VENTA, baucher_foto }).success).toBe(false);
  });
});
