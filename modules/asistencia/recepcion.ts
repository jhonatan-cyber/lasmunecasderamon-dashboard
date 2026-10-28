import 'server-only';

/**
 * Entrada pública mínima del ciclo de vida de la recepción biométrica.
 *
 * `instrumentation.ts` sólo necesita encender y consultar la recepción al
 * arrancar el servidor. Importar el barrel completo (`index.ts`) obligaba a
 * compilar y enlazar enrolamiento facial, FFmpeg, video, kioscos y el resto de
 * la API pública de Asistencia en ese camino: ~10,8 s de arranque en frío.
 *
 * Este archivo expone únicamente lo que el arranque necesita. El resto de los
 * consumidores sigue entrando por `modules/asistencia` (index.ts).
 */
export { arrancarRecepcionBiometrica, recepcionActiva } from './procesos';
