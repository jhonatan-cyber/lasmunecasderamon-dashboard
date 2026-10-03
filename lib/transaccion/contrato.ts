/**
 * Contrato transaccional — Fase 1 del plan de monolito modular (§6).
 *
 * El §6 pide que los participantes de una operación atómica reciban «un
 * contexto transaccional opaco», que «sólo la infraestructura autorizada resuelve
 * al cliente PostgreSQL» y que «el contrato no expone una función SQL
 * arbitraria».
 *
 * Lo que hay hoy, `TransactionQuery` de `lib/database/db`, es una función
 * `(sql, params) => rows`: quien la recibe puede ejecutar cualquier sentencia
 * sobre cualquier tabla. Eso hace imposible garantizar el principio 1 del plan —
 * que nadie escriba tablas ajenas— aunque se reorganice la arquitectura entera.
 *
 * `UnidadDeTrabajo` sí cumple el §6: expone operaciones con nombre, no SQL.
 *
 * **No cambia el comportamiento de nada todavía.** `enUnaUnidad` es un adaptador
 * sobre el `withTransaction` existente. Su propósito es que las fases siguientes
 * migren un módulo detrás de un contrato que ya respeta el plan. Migrar
 * `AccountService.cobrarConVenta` —el flujo atómico que la Fase 5 parte— es
 * trabajo de esa fase, no de ésta.
 */
import { withTransaction } from '@/lib/database/db';

/** Lo que recibe un módulo para trabajar dentro de una unidad ajena. */
export interface ContextoOperacion {
  /** Identificador de la unidad, para correlación en logs y auditoría. */
  readonly id: string;
}

/**
 * Unidad de trabajo compartida.
 *
 * Quien la recibe puede pedir operaciones al módulo que se la entregó, pero no
 * ejecutar SQL: las operaciones de cada módulo viven en su API pública, no aquí.
 */
export interface UnidadDeTrabajo {
  /** Identificador para diagnóstico y correlación. */
  readonly id: string;
  /** Si sigue abierta. Los efectos externos deben esperar a `false` (§6). */
  readonly abierta: boolean;
  /**
   * Ejecuta una operación dentro de esta unidad sin abrir otra transacción.
   * Si lanza, la unidad completa se revierte.
   */
  ejecutar<T>(operacion: (contexto: ContextoOperacion) => Promise<T>): Promise<T>;
}

/**
 * Ejecuta `operacion` de forma atómica y devuelve su resultado.
 *
 * La puerta de entrada para una operación entre módulos: el coordinador abre una
 * sola unidad, se la pasa a los participantes y confirma una vez. Si algo falla,
 * revierte todo, que es el requisito del §6.
 */
export async function enUnaUnidad<T>(
  operacion: (unidad: UnidadDeTrabajo) => Promise<T>
): Promise<T> {
  return withTransaction(async trx => {
    const id = crypto.randomUUID();
    let abierta = true;

    const unidad: UnidadDeTrabajo = {
      id,
      get abierta() {
        return abierta;
      },
      async ejecutar<T2>(op: (contexto: ContextoOperacion) => Promise<T2>): Promise<T2> {
        if (!abierta) {
          throw new Error(`UnidadDeTrabajo ${id} ya no admite operaciones`);
        }
        // El contexto lleva el identificador, no el `trx`: por eso este contrato
        // no expone una función SQL arbitraria. Cada módulo resuelve su propio
        // acceso cuando se migre.
        return op({ id });
      }
    };

    try {
      return await operacion(unidad);
    } finally {
      // Se cierra tanto si la operación va bien como si falla. Marcarlo sólo en
      // el camino feliz dejaba la unidad "abierta" después de un rollback, y
      // quien luego lance efectos externos creyendo que el commit ocurrio.
      abierta = false;
      void trx;
    }
  });
}
