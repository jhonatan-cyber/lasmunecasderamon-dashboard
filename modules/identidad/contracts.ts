/**
 * Contratos de identidad y permisos — Fase 3 del plan de monolito modular.
 *
 * Los demás módulos NO importan la implementación de la identidad
 * (`lib/auth`, `lib/middleware`): reciben el actor ya verificado en sus
 * parámetros. Este `contracts.ts` es el único punto del que beben tipos de
 * identidad (§5: entre módulos sólo `index.ts` o `contracts.ts`), de modo que
 * la dependencia asistencia → identidad es de tipos y no crea un import de
 * implementación nuevo.
 *
 * La verificación de permisos sigue donde está hoy: en la ruta (adaptador
 * HTTP), antes de llamar al módulo. Un módulo no consulta permisos propios ni
 * ajenos — esa regla de negocio vive en Identidad y en los adaptadores.
 */
import type { AuthenticatedUser, UserPermissions } from '@/lib/middleware/auth';

/**
 * Identidad mínima de quien ejecuta una operación de módulo. Es assignable
 * desde la sesión completa (`getAuth()`, el `user` de `withRoute`) y desde
 * cualquier fixture con `id`.
 */
export interface Actor {
  id: string;
}

/** Permisos resueltos del actor, tal como los calcula el middleware. */
export type Permisos = UserPermissions;

/**
 * La sesión completa. La consumen los adaptadores (rutas) que necesitan
 * rol y permisos para autorizar; los módulos sólo reciben `Actor`.
 */
export type Sesion = AuthenticatedUser;
