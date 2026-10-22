import { test as base, expect, type Page } from '@playwright/test';
import * as argon2 from 'argon2';
import dotenv from 'dotenv';
import { randomBytes, randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { connectionConfig } from '../../../lib/database/postgres.cjs';

dotenv.config({ quiet: true });

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const EPHEMERAL_PREFIX = 'e2e-admin-';
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

export type AdminAccount = {
  user: string;
  password: string;
  ephemeral: boolean;
};

export type AdminFixture =
  { ok: true; account: AdminAccount; dispose: () => Promise<void> } | { ok: false; reason: string };

type DbConfig = { host: string; database: string };

function blockedReason(config: DbConfig): string | null {
  if (process.env.E2E_ADMIN_FIXTURE === 'off') {
    return 'E2E_ADMIN_FIXTURE=off: no se crea el administrador efímero';
  }
  if (!LOOPBACK_HOSTS.has(config.host)) {
    return `El administrador efímero solo se crea en PostgreSQL local (DB_HOST=${config.host})`;
  }
  if (/(^|[_-])(prod|production)([_-]|$)/i.test(config.database)) {
    return `La base ${config.database} parece de producción; define TEST_PASSWORD o usa una base desechable`;
  }
  return null;
}

async function provisionAdmin(): Promise<AdminFixture> {
  if (process.env.TEST_PASSWORD) {
    return {
      ok: true,
      account: {
        user: process.env.TEST_USER ?? 'Admin',
        password: process.env.TEST_PASSWORD,
        ephemeral: false
      },
      dispose: async () => {}
    };
  }

  const config = connectionConfig();
  const db = {
    ...config,
    host: config.host ?? '127.0.0.1',
    database: config.database ?? 'lasmunecasderamon'
  };
  const reason = blockedReason(db);
  if (reason) return { ok: false, reason };

  const client = new Client(db);
  try {
    await client.connect();

    // Un cierre abrupto del runner puede dejar filas huérfanas; se limpian las
    // que ya llevan un día sin uso antes de crear la nueva. Si alguna referencia
    // las bloquea, no se impide crear la cuenta de esta ejecución.
    try {
      await client.query(
        `DELETE FROM logins
         WHERE usuario_id IN (
           SELECT id_usuario FROM usuarios
           WHERE nick LIKE $1 AND fecha_crea < CURRENT_TIMESTAMP - INTERVAL '1 day'
         )`,
        [`${EPHEMERAL_PREFIX}%`]
      );
      await client.query(
        `DELETE FROM usuarios
         WHERE nick LIKE $1 AND fecha_crea < CURRENT_TIMESTAMP - INTERVAL '1 day'`,
        [`${EPHEMERAL_PREFIX}%`]
      );
    } catch (error) {
      console.warn(
        `[e2e] No se pudieron limpiar administradores antiguos: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    const roles = await client.query<{ id_rol: string }>(
      `SELECT id_rol FROM roles
       WHERE estado = 1 AND LOWER(BTRIM(nombre)) IN ('administrador', 'admin')
       ORDER BY CASE WHEN LOWER(BTRIM(nombre)) = 'administrador' THEN 0 ELSE 1 END
       LIMIT 1`
    );
    const rolId = roles.rows[0]?.id_rol;
    if (!rolId) {
      await client.end();
      return { ok: false, reason: 'La base no tiene un rol Administrador activo' };
    }

    const id = randomUUID();
    const nick = `${EPHEMERAL_PREFIX}${id.slice(0, 8)}`;
    const password = randomBytes(24).toString('base64url');
    const hash = await argon2.hash(password);

    await client.query(
      `INSERT INTO usuarios (
         id_usuario, run, nick, nombre, apellido, direccion, telefono,
         estado_civil, afp, aporte, sueldo, descuento, email, password,
         rol_id, foto, estado, estado_servicio, fecha_crea,
         force_password_change
       ) VALUES ($1, $2, $3, $4, $5, '-', '-', '-', 'N/A', 0, 0, 0, $6, $7,
         $8, 'default.png', 1, 1, CURRENT_TIMESTAMP, 0)`,
      [id, `E2E-${id}`, nick, 'Administrador', 'Efimero', `${nick}@e2e.local`, hash, rolId]
    );

    console.log(`[e2e] Administrador efímero ${nick} en ${db.database}@${db.host}`);

    return {
      ok: true,
      account: { user: nick, password, ephemeral: true },
      dispose: async () => {
        try {
          await client.query('BEGIN');
          await client.query('DELETE FROM logins WHERE usuario_id = $1', [id]);
          await client.query('DELETE FROM usuarios WHERE id_usuario = $1', [id]);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK').catch(() => {});
          // Si alguna referencia impide borrar la fila, al menos se revoca el
          // acceso y se desvincula de la identidad visible.
          await client
            .query(
              `UPDATE usuarios
               SET estado = 0, session_version = session_version + 1,
                   nick = NULL, email = NULL
               WHERE id_usuario = $1`,
              [id]
            )
            .catch(() => {});
          console.warn(
            `[e2e] No se pudo eliminar el administrador ${nick}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        } finally {
          await client.end().catch(() => {});
        }
      }
    };
  } catch (error) {
    await client.end().catch(() => {});
    throw new Error(
      `No se pudo crear el administrador efímero en ${db.database}@${db.host}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export const test = base.extend<Record<never, never>, { admin: AdminFixture }>({
  admin: [
    async ({}, useAdmin) => {
      const fixture = await provisionAdmin();
      try {
        await useAdmin(fixture);
      } finally {
        if (fixture.ok) await fixture.dispose();
      }
    },
    { scope: 'worker' }
  ]
});

export { expect };

/** Devuelve la cuenta o marca el test como omitido con un motivo accionable. */
export function requireAdmin(fixture: AdminFixture): AdminAccount {
  if (!fixture.ok) {
    base.skip(true, fixture.reason);
    throw new Error(fixture.reason);
  }
  return fixture.account;
}

/**
 * Abre /login y espera a que React esté hidratado: el fetch de montaje de la
 * pantalla (`check-users`) solo corre en el cliente, así que su respuesta
 * garantiza que el formulario ya responde a clics.
 */
export async function gotoLoginHydrated(page: Page) {
  const usersLoaded = page.waitForResponse(
    response => response.url().includes('/api/auth/check-users') && response.status() === 200,
    { timeout: 30_000 }
  );
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await usersLoaded;
}

export async function loginAsAdmin(page: Page, account: AdminAccount) {
  await gotoLoginHydrated(page);
  await expect(page.locator('#nick')).toBeVisible({ timeout: 20_000 });
  await page.locator('#nick').fill(account.user);
  await page.locator('#password').fill(account.password);
  await page.locator('button[type="submit"]').first().click();

  const codeStep = page.locator('input[placeholder="0000"]');
  if (await codeStep.isVisible({ timeout: 3_000 }).catch(() => false)) {
    base.skip(true, 'La cuenta de prueba pide verificación por código');
  }

  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30_000 });
}
