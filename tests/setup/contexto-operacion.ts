import type { TransactionQuery } from '@/lib/database/db';
import { liberar, registrar } from '@/lib/transaccion/infraestructura';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';

/** Adaptador temporal para los consumidores heredados de una transacción opaca. */
export async function conContextoOperacionExistente<T>(
  trx: TransactionQuery,
  operacion: (contexto: ContextoOperacion) => Promise<T>
): Promise<T> {
  const id = crypto.randomUUID();
  registrar(id, trx);
  try {
    return await operacion({ id });
  } finally {
    liberar(id);
  }
}
