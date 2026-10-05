import 'server-only';

/**
 * API pública del módulo Salud — servidor.
 *
 * Único punto de entrada para rutas HTTP (§5). Los repositorios son privados: la
 * puerta `modulo-solo-api-publica` de `scripts/arquitectura/limites.mjs` falla
 * ante cualquier import que apunte al interior por otra vía. Los tipos viven en
 * `./contracts`.
 *
 * Nace en el corte 12d, el último que queda de la fase 5: con él, `app/api` no
 * tiene ni una ruta que importe `lib/database/db` y el censo de
 * `scripts/arquitectura/analisis.mjs` baja a cero rutas con acceso al driver.
 */
export { obtenerReporteDeSalud } from './servicio';
