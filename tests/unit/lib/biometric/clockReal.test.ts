// @vitest-environment node
import 'dotenv/config';
import pg from 'pg';
import { describe, expect, it } from 'vitest';

import { descifrarSecreto } from '@/modules/asistencia/biometrico/credencialesCrypto';
import { leerHoraEquipo, sincronizarRelojEquipo } from '@/modules/asistencia/biometrico/clockSync';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import type { CredencialesEquipo } from '@/modules/asistencia/biometrico/deviceClient';

/**
 * Prueba REAL de la sincronización del reloj contra el lector (mismo patrón
 * que audioReal.test.ts). Toma las credenciales del primer equipo activo de la
 * base, mide el desfase entre la hora que reporta el propio equipo
 * (`CLIENT_QueryDeviceTime`) y la hora del negocio del servidor, corrige el
 * reloj con `CLIENT_SetupDeviceTime` y vuelve a medir: debe quedar dentro del
 * umbral (300 s). Se corre a propósito, aparte:
 *
 *   AUDIO_REAL=1 npx vitest run tests/unit/lib/biometric/clockReal.test.ts
 *
 * Fuera de esa puerta es `describe.skip`: la suite unitaria nunca toca el
 * hardware ni la base de datos real.
 */
const REAL = process.env.AUDIO_REAL === '1';
const d = REAL ? describe : describe.skip;

const UMBRAL_SEGUNDOS = 300;

/** Compara dos horas "YYYY-MM-DD HH:MM:SS" de PARED, reloj contra reloj. */
function desfaseSegundos(horaEquipo: string, horaServidor: string): number {
  const epoch = (t: string) => new Date(`${t.replace(' ', 'T')}Z`).getTime() / 1000;
  return epoch(horaEquipo) - epoch(horaServidor);
}

d('sincronización REAL del reloj del lector', () => {
  it('mide el desfase con QueryDeviceTime, corrige con SetupDeviceTime y queda en hora del servidor', async () => {
    const db = new pg.Client({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined
    });
    await db.connect();
    const { rows } = await db.query<{
      ip: string;
      usuario_equipo: string;
      clave_cifrada: string;
    }>(
      'SELECT ip, usuario_equipo, clave_cifrada FROM biometric_devices WHERE revocado_en IS NULL AND ip IS NOT NULL AND clave_cifrada IS NOT NULL LIMIT 1'
    );
    await db.end();

    expect(rows[0], 'No hay equipo activo con credenciales en la DB').toBeTruthy();
    const credenciales: CredencialesEquipo = {
      ip: rows[0].ip,
      usuario: rows[0].usuario_equipo,
      clave: descifrarSecreto(rows[0].clave_cifrada)
    };

    const antes = desfaseSegundos(await leerHoraEquipo(credenciales), getNowInBusinessTimezone());
    console.log('[clock-real] desfase ANTES (s):', Math.round(antes));

    await sincronizarRelojEquipo(credenciales);
    console.log('[clock-real] CLIENT_SetupDeviceTime OK');

    // Pequeña espera: el firmware aplica el cambio antes de responder de nuevo.
    await new Promise(resolve => setTimeout(resolve, 2_000));

    const despues = desfaseSegundos(await leerHoraEquipo(credenciales), getNowInBusinessTimezone());
    console.log('[clock-real] desfase DESPUÉS (s):', Math.round(despues));

    expect(
      Math.abs(despues),
      `El reloj quedó a ${Math.round(despues)} s (umbral ${UMBRAL_SEGUNDOS} s)`
    ).toBeLessThanOrEqual(UMBRAL_SEGUNDOS);
  }, 120_000);
});
