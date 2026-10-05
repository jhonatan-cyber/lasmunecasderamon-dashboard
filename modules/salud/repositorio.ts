/**
 * Infraestructura de Salud. SQL privado: nadie fuera de `modules/salud` importa
 * este archivo (§5).
 *
 * Antes de este repositorio, la ruta `app/api/health` llamaba a
 * `verificarConexion()` de `lib/database/db` directamente. No escribía nada, pero
 * importaba el driver desde una ruta: el mismo límite que rompe la puerta
 * `modulo-solo-api-publica` en el resto de la aplicación, sólo que visto desde
 * `app/api`. Por eso el censo de `scripts/arquitectura/analisis.mjs` seguía
 * reportando una ruta con acceso al driver.
 */
import { verificarConexion } from '@/lib/database/db';
import type { EstadoBaseDatos } from './contracts';

/** Sondeo de vida al driver. La consulta vive en `lib/database/db`, no aquí. */
export async function comprobarBaseDatos(): Promise<EstadoBaseDatos> {
  try {
    const response = await verificarConexion();
    return { status: 'healthy', response };
  } catch {
    // Un health check que lanza deja el sondaor sin respuesta; reportar degradado
    // es más útil que un 500, y quien llama decide si eso le basta.
    return { status: 'unhealthy', response: null };
  }
}
