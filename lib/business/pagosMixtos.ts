import { ValidationError } from '@/lib/errors/errors';

export type MixedPayment = {
  metodo: string;
  monto: number;
};

export function parsePagosMixtos(raw: any): MixedPayment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((pago: any) => ({
      metodo: String(pago?.metodo || ''),
      monto: Number(pago?.monto || 0)
    }))
    .filter(pago => pago.metodo && pago.monto > 0);
}

export function validatePagosMixtos(pagosMixtos: MixedPayment[], total: number): void {
  if (pagosMixtos.length < 2) {
    throw new ValidationError('Pago mixto invalido: se requieren al menos 2 metodos');
  }
  const suma = pagosMixtos.reduce((sum, p) => sum + p.monto, 0);
  if (Math.abs(suma - total) > 1) {
    throw new ValidationError('Pago mixto invalido: la suma debe ser igual al total', {
      suma,
      total
    });
  }
}

export function calcularDeltasCaja(pagosMixtos: MixedPayment[]) {
  return pagosMixtos.reduce(
    (acc, pago) => {
      if (pago.metodo === 'efectivo') acc.efectivo += pago.monto;
      if (pago.metodo === 'tarjeta') acc.tarjeta += pago.monto;
      if (pago.metodo === 'transferencia') acc.transferencia += pago.monto;
      return acc;
    },
    { efectivo: 0, tarjeta: 0, transferencia: 0 }
  );
}
