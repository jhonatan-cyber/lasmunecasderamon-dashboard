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

/* Forma de datos que cruzan la frontera del módulo (corte 12). */

/** Permiso vivo, tal como lo devuelve la matriz de un rol. */
export interface Permiso {
  id: string;
  name: string;
  description: string | null;
  module: string;
  action: string;
}

/** Permiso con la marca de si el rol lo tiene asignado. */
export interface PermisoDeRol extends Permiso {
  created_at: string | null;
  updated_at: string | null;
  assigned: boolean;
}

/** Entrada del catálogo que siembra los permisos del rol cajero. */
export interface PermisoCatalogo {
  module: string;
  action: string;
  name: string;
}

/** Nombre, apellido y nick de una persona: lo que muestra su propia pantalla. */
export interface ResumenUsuario {
  nombre: string;
  apellido: string;
  nick: string | null;
}

/** Entrada del padrón público de personal, ya con el nombre unido. */
export interface UsuarioPublico {
  id: string;
  name: string;
  nick: string | null;
  foto: string;
  role: string;
}

/** Personal activo con su rol, tal como lo pinta el tablero del kiosko. */
export interface PersonalActivo {
  id: string;
  nombre: string;
  apellido: string;
  nick: string | null;
  foto: string | null;
  rol: string | null;
}
