import { PermissionsCache } from '@/lib/auth/permissions-cache';
import { matrixFlagsFor, toMatrixModule } from '@/lib/constants/route-permissions';

export interface UserPermissions {
  /**
   * Ciclo de roles (`roles.*` del catálogo): lo que verifican los handlers de
   * `/api/roles*`, que antes pedían `users.*` mientras el middleware gateaba con
   * `roles.*` — dos vocabularios para la misma autorización. `roles.permissions` no
   * tiene flag propio: la UI lo consulta sobre los pares crudos del catálogo
   * (`hasPermission`), no sobre esta matriz.
   */
  roles: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  users: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  sales: {
    read: boolean;
    write: boolean;
    delete: boolean;
    anulate: boolean;
  };
  products: {
    read: boolean;
    write: boolean;
    delete: boolean;
    accept_transfer?: boolean;
    /** Verificar y marcar la devolución de un envase vacío (migración 032). */
    return_container?: boolean;
    /** Confirmar que el almacén recibió el envase entregado por el bar (033). */
    confirm_container_return?: boolean;
  };
  clients: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  finances: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  reports: {
    read: boolean;
    export: boolean;
  };
  settings: {
    read: boolean;
    write: boolean;
  };
  orders: {
    read: boolean;
    write: boolean;
    delete: boolean;
    process: boolean;
  };
  advances: {
    read: boolean;
    write: boolean;
    delete: boolean;
    process: boolean;
  };
  commissions: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  payroll: {
    read: boolean;
    write: boolean;
  };
  rooms: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  attendance: {
    read: boolean;
    write: boolean;
  };
  overtime: {
    read: boolean;
    write: boolean;
  };
  tips: {
    read: boolean;
    write: boolean;
  };
  gratificaciones: {
    read: boolean;
    write: boolean;
    /**
     * Par `gratificaciones.edit` del catálogo. Existe separado de `write` a
     * propósito: `create` también colapsa a `write`, así que sin este flag el
     * PUT de /api/gratificaciones/[id] le sería accesible a cualquiera que
     * pueda solo solicitar (el cajero).
     */
    edit: boolean;
    delete: boolean;
  };
  accounts: {
    read: boolean;
    write: boolean;
    edit: boolean;
  };
  categories: {
    read: boolean;
    write: boolean;
    /** Borrar una categoría (el catálogo ya lo modelaba como `categories.delete`). */
    delete: boolean;
  };
  returns: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  dashboard: {
    read: boolean;
  };
  private_rooms: {
    read: boolean;
    write: boolean;
  };
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  name: string;
  lastName: string;
  nick?: string;
  email: string;
  role: string;
  permissions: UserPermissions;
  iat: number;
  exp: number;
}

/*
 * La traducción catálogo → matriz (`actionMap`/`moduleAliases` de antes) vive en
 * `lib/constants/route-permissions` (`toMatrixAction`/`toMatrixModule`). Es la única
 * copia del vocabulario: el test de `withRoute` la usa en la dirección contraria para
 * comprobar que los handlers de `app/api` y las tablas de rutas del middleware no
 * divergen. Lo que el catálogo no traduzca acá no puede conceder nada en la matriz.
 */

/**
 * Matriz sin ningún permiso concedido.
 *
 * Es la respuesta por defecto cuando el usuario no tiene rol o su rol no tiene
 * filas en `role_permissions`. Antes se caía a una matriz hardcodeada por nombre
 * de rol: vaciar los permisos de un rol (o crear uno nuevo) "revivía" permisos que
 * nadie había asignado. La ausencia de datos ahora se traduce en ausencia de acceso.
 */
export function createEmptyPermissions(): UserPermissions {
  return {
    roles: { read: false, write: false, delete: false },
    users: { read: false, write: false, delete: false },
    sales: { read: false, write: false, delete: false, anulate: false },
    products: {
      read: false,
      write: false,
      delete: false,
      accept_transfer: false,
      return_container: false,
      confirm_container_return: false
    },
    clients: { read: false, write: false, delete: false },
    finances: { read: false, write: false, delete: false },
    reports: { read: false, export: false },
    settings: { read: false, write: false },
    orders: { read: false, write: false, delete: false, process: false },
    advances: { read: false, write: false, delete: false, process: false },
    commissions: { read: false, write: false, delete: false },
    payroll: { read: false, write: false },
    rooms: { read: false, write: false, delete: false },
    attendance: { read: false, write: false },
    overtime: { read: false, write: false },
    tips: { read: false, write: false },
    gratificaciones: { read: false, write: false, edit: false, delete: false },
    accounts: { read: false, write: false, edit: false },
    categories: { read: false, write: false, delete: false },
    returns: { read: false, write: false, delete: false },
    dashboard: { read: false },
    private_rooms: { read: false, write: false }
  };
}

export async function getUserPermissionsFromDB(userId: string): Promise<UserPermissions> {
  // Redis primero (caché compartida entre procesos); cae a memoria si no responde.
  const cached = await PermissionsCache.read(userId);
  if (cached) return cached;

  const userPerms = createEmptyPermissions();

  try {
    const { query } = await import('@/lib/database/db');

    const userResult = (await query(`SELECT rol_id FROM usuarios WHERE id_usuario = ?`, [
      userId
    ])) as Array<{ rol_id: string | number | null }>;

    const roleId = userResult?.[0]?.rol_id;

    // Sin usuario o sin rol no hay nada que conceder.
    if (roleId) {
      const permissions = (await query(
        `SELECT p.module, p.action FROM permissions p INNER JOIN role_permissions rp ON p.id = rp.permission_id WHERE rp.role_id = ? AND p.deleted_at IS NULL`,
        [String(roleId)]
      )) as Array<{ module: string; action: string }>;

      permissions?.forEach(perm => {
        const moduleName = toMatrixModule(perm.module) as keyof UserPermissions;
        const modulePerms = userPerms[moduleName];
        if (!modulePerms) return;

        // La regla de flags (traducido + homónimo) vive en matrixFlagsFor.
        for (const flag of matrixFlagsFor(modulePerms as Record<string, boolean>, perm.action)) {
          (modulePerms as any)[flag] = true;
        }
      });
    }
  } catch {
    // Error de BD: permisos vacíos y sin cachear, para que el próximo request
    // vuelva a resolverlos en lugar de fijar una denegación por error.
    return userPerms;
  }

  PermissionsCache.set(userId, userPerms);
  return userPerms;
}

/**
 * El rol administrador tiene acceso implicito a todos los modulos y es el unico
 * que puede consultar los endpoints de diagnostico y mantenimiento.
 * Punto unico de verdad: las rutas y withRoute lo reutilizan.
 */
export function isAdministrator(user: Pick<AuthenticatedUser, 'role'> | null | undefined): boolean {
  return user?.role?.toLowerCase() === 'administrador';
}
