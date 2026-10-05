/**
 * Casos de uso de saldos de anticipo — aplicación del módulo Personal.
 *
 * No toca SQL ni el driver: eso vive en `./repositorio`, que es privado del módulo.
 * Es una reexportación porque el balance es una lectura pura, sin validación ni
 * orquestación que justifique una capa aparte.
 */
export { getAnticipoBalances } from './repositorio';
