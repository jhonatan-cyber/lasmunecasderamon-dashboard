import { logger } from '@/lib/utils/logger';
export async function ejecutarEfectosConfirmados(tareas: Array<() => void | Promise<void>>) {
  for (const tarea of tareas) {
    try {
      await tarea();
    } catch (error) {
      logger.error('Falló un efecto posterior al commit; la operación sigue confirmada', { error });
    }
  }
}
