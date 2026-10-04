// @vitest-environment node
import 'dotenv/config';
import pg from 'pg';
import { describe, expect, it } from 'vitest';

import { descifrarSecreto } from '@/modules/asistencia/biometrico/credencialesCrypto';
import {
  AUDIO_ENROLAMIENTO,
  reproducirAudioEquipo
} from '@/modules/asistencia/biometrico/audioService';
import type { CredencialesEquipo } from '@/modules/asistencia/biometrico/deviceClient';

/**
 * Prueba REAL del envío de audio al lector: **suena en la puerta**. Toma las
 * credenciales del primer equipo activo de la base, convierte el MP3 de
 * `public/audio` y lo manda por Talk con el MISMO código que usa el dashboard
 * (`avisosAudio` → `audioService` → `audioLib`), sin cargar nada en el equipo.
 *
 *   AUDIO_REAL=1 npx vitest run tests/unit/lib/biometric/audioReal.test.ts
 *
 * Fuera de esa puerta es `describe.skip`: la suite unitaria nunca toca el
 * hardware ni la base de datos real.
 */
const REAL = process.env.AUDIO_REAL === '1';
const d = REAL ? describe : describe.skip;

d('envío REAL de audio por Talk', () => {
  it('manda usuarioRegistrado.mp3 al altavoz del lector sin cargar archivos', async () => {
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

    const r = await reproducirAudioEquipo(credenciales, AUDIO_ENROLAMIENTO);
    console.log('[audio-real] envío:', r);

    expect(r.ok, r.error).toBe(true);
    expect(r.enviados).toBeGreaterThan(0);
  }, 120_000);
});
