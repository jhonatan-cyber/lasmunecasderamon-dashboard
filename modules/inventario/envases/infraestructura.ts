/**
 * Casos de uso de devolución de envases — API pública de servidor del módulo
 * inventario.
 *
 * Cada operación transaccional acepta un `ContextoOperacion` opaco (§6): con
 * contexto escribe en la transacción que abrió el flujo que lo llamó; sin
 * contexto abre su propia unidad. Estas operaciones no crean movimientos de
 * inventario ni efectos posteriores al commit: la entrega y la recepción son
 * sólo marcas físicas sobre la unidad.
 */
import { withTransaction } from '@/lib/database/db';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import type { DevolucionEnvaseRegistro, DevolucionEnvaseResultado } from '../contracts';
export type { ResumenEnvases } from '../contracts';
import {
  confirmarRecepcionEnvase as confirmarEnRepositorio,
  HORAS_ENVASE_SIN_CONFIRMAR,
  listarDevoluciones,
  obtenerResumenEnvases,
  verificarYMarcarEnvase as verificarEnRepositorio
} from './repositorio';

export { HORAS_ENVASE_SIN_CONFIRMAR, listarDevoluciones, obtenerResumenEnvases };

/**
 * Escanea un envase en el bar: si es nuestro, está vacío y todavía no se
 * entregó, lo marca como devuelto en el mismo paso.
 */
export async function verificarEnvase(
  codigoEscaneado: unknown,
  usuarioId: string | null,
  contexto?: ContextoOperacion
): Promise<DevolucionEnvaseResultado> {
  if (contexto) {
    return await verificarEnRepositorio(resolverTransaccion(contexto), codigoEscaneado, usuarioId);
  }
  let resultado!: DevolucionEnvaseResultado;
  await withTransaction(async trx => {
    resultado = await verificarEnRepositorio(trx, codigoEscaneado, usuarioId);
  });
  return resultado;
}

/** Verifica varios códigos dentro de una sola transacción para el scanner móvil. */
export async function verificarEnvases(
  codigosEscaneados: unknown[],
  usuarioId: string | null
): Promise<DevolucionEnvaseResultado[]> {
  const codigos = [
    ...new Set(
      codigosEscaneados
        .map(codigo =>
          String(codigo ?? '')
            .trim()
            .toUpperCase()
        )
        .filter(Boolean)
    )
  ];
  if (codigos.length === 0) return [];

  let resultados: DevolucionEnvaseResultado[] = [];
  await withTransaction(async trx => {
    resultados = [];
    for (const codigo of codigos) {
      resultados.push(await verificarEnRepositorio(trx, codigo, usuarioId));
    }
  });
  return resultados;
}

/**
 * Escanea un envase en el almacén: confirma la recepción de uno que el bar ya
 * entregó.
 */
export async function confirmarRecepcionEnvase(
  codigoEscaneado: unknown,
  usuarioId: string | null,
  contexto?: ContextoOperacion
): Promise<DevolucionEnvaseResultado> {
  if (contexto) {
    return await confirmarEnRepositorio(resolverTransaccion(contexto), codigoEscaneado, usuarioId);
  }
  let resultado!: DevolucionEnvaseResultado;
  await withTransaction(async trx => {
    resultado = await confirmarEnRepositorio(trx, codigoEscaneado, usuarioId);
  });
  return resultado;
}
