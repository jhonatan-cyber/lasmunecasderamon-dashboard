/**
 * Resolución autorizada del contexto transaccional — §6 del plan, punto 3:
 * «sólo la infraestructura autorizada resuelve ese contexto al cliente
 * PostgreSQL».
 *
 * `contrato.ts` entrega a los participantes un contexto opaco que no lleva SQL.
 * Este archivo es la vía inversa: convierte ese contexto en el ejecutor de
 * sentencias de la unidad, **sólo para la infraestructura de los módulos**. La
 * puerta `infra-transaccional-autorizada` de `scripts/arquitectura/limites.mjs`
 * restringe quién puede importarlo; el código de negocio, los workflows y las
 * rutas HTTP no pueden resolver el contexto por sí mismos, y por eso el
 * contrato sigue sin exponer una función SQL arbitraria.
 */
import type { TransactionQuery } from '@/lib/database/db';
import type { ContextoOperacion } from './contrato';

/** Transacciones vivas, por identificador de unidad. Registro interno. */
const unidades = new Map<string, TransactionQuery>();

/**
 * Registra el ejecutor de una unidad recién abierta. Uso interno de
 * `enUnaUnidad`; no lo llamen desde los módulos.
 */
export function registrar(id: string, trx: TransactionQuery): void {
  unidades.set(id, trx);
}

/** Libera la transacción de una unidad cerrada (confirmada o revertida). */
export function liberar(id: string): void {
  unidades.delete(id);
}

/**
 * Ejecutor de sentencias de la unidad a la que pertenece el contexto.
 *
 * Falla si la unidad ya confirmó o revirtió: escribir después del cierre es
 * exactamente la fuga que el §6 prohíbe (efectos sobre una transacción que ya
 * no existe, silenciosamente por fuera de ella).
 */
export function resolverTransaccion(contexto: ContextoOperacion): TransactionQuery {
  const trx = unidades.get(contexto.id);
  if (!trx) {
    throw new Error(
      `La unidad ${contexto.id} no tiene transacción resoluble: ya confirmó, revirtió, o el contexto no proviene de enUnaUnidad`
    );
  }
  return trx;
}
