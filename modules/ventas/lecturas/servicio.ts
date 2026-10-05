/**
 * Casos de uso de lecturas de venta — aplicación del módulo Ventas.
 *
 * No toca SQL ni el driver: eso vive en `./repositorio`, que es privado del módulo.
 * Son lecturas puras: la reexportación basta como capa de aplicación.
 */
export { listarVentasEnCurso, obtenerHabitacionActivaDeAnfitrionas } from './repositorio';
