/**
 * Casos de uso de horas extras — aplicación del módulo Personal.
 *
 * Valida la entrada y orquesta la infraestructura propia. No toca SQL ni el
 * driver: eso vive en `./repositorio`, que es privado del módulo. Cada
 * operación acepta un `ContextoOperacion` opcional para participar de una
 * unidad de trabajo ajena (§6) sin abrir transacciones independientes.
 */
import { z } from 'zod';
import { ExtraHoursSchema } from '@/lib/business/schemas';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import type {
  CambiosHoraExtra,
  EntradaHoraExtra,
  FiltrosHorasExtras,
  HoraExtra,
  HoraExtraRegistrada
} from '../contracts';
import * as repositorio from './repositorio';

export async function listarHorasExtras(
  filtros: FiltrosHorasExtras = {},
  contexto?: ContextoOperacion
): Promise<HoraExtra[]> {
  return repositorio.buscarTodas(filtros, contexto);
}

export async function listarHorasExtrasDeUsuario(
  usuarioId: string,
  filtros?: { desde?: string; hasta?: string },
  contexto?: ContextoOperacion
): Promise<HoraExtra[]> {
  return repositorio.buscarTodas({ usuarioId, ...filtros }, contexto);
}

export async function listarHorasExtrasPorFechas(
  usuarioId: string,
  fechas: string[],
  contexto?: ContextoOperacion
): Promise<HoraExtra[]> {
  return repositorio.buscarPorFechas(usuarioId, fechas, contexto);
}

export async function registrarHoraExtra(
  entrada: EntradaHoraExtra,
  contexto?: ContextoOperacion
): Promise<HoraExtraRegistrada | null> {
  const validated = ExtraHoursSchema.parse(entrada);
  return repositorio.insertar(
    {
      usuario_id: validated.usuario_id,
      hora: validated.hora,
      monto: entrada.monto,
      device_date: entrada.device_date
    },
    contexto
  );
}

export async function actualizarHoraExtra(
  id: string,
  datos: CambiosHoraExtra,
  contexto?: ContextoOperacion
): Promise<HoraExtraRegistrada | null> {
  const schema = z
    .object({
      hora: z.number().int().positive('La hora debe ser válida').optional(),
      monto: z.number().min(0, 'El monto no puede ser negativo').optional(),
      estado: z.number().int().optional()
    })
    .partial();
  const validated = schema.parse(datos);
  return repositorio.actualizar(id, validated, contexto);
}

export async function eliminarHoraExtra(id: string, contexto?: ContextoOperacion): Promise<void> {
  return repositorio.eliminar(id, contexto);
}
