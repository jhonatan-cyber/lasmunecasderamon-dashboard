import 'server-only';

/**
 * API pública del módulo Reservas de Quincho — servidor.
 *
 * Único punto de entrada para rutas HTTP, workflows y otros módulos (§5); el
 * repositorio es privado. El dinero (prepago y caja) no se mueve acá: lo
 * coordina `workflows/reservas-quincho`.
 */
export {
  crearReservaEnUnidad,
  listarReservas,
  marcarAnuladaEnUnidad,
  reclamarReserva
} from './servicio';

export type { ReservaQuincho, ReservaQuinchoCreate } from '@/types/quincho';
