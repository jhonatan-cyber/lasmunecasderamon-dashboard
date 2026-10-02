import crypto from 'crypto';
import { query } from '@/lib/database/db';
import { ValidationError } from '@/lib/errors/errors';
import type { BiometricMarca } from '@/lib/biometric/types';

const SERIAL_RE = /^[a-zA-Z0-9._:-]{3,64}$/;

export async function findActiveDevice(serial: string) {
  const limpio = serial.trim();
  if (!SERIAL_RE.test(limpio)) return null;
  const rows = await query<{ id: string; nombre: string; marca: BiometricMarca; serial: string }[]>(
    `SELECT id, nombre, marca, serial FROM biometric_devices
      WHERE LOWER(serial) = LOWER(?) AND revocado_en IS NULL`,
    [limpio]
  );
  return rows[0] ?? null;
}

export async function touchDevice(id: string) {
  await query('UPDATE biometric_devices SET ultimo_uso = CURRENT_TIMESTAMP WHERE id = ?', [id]);
}

export async function createBiometricDevice(
  data: { nombre: string; marca: BiometricMarca; modelo?: string; serial: string; ip?: string },
  userId: string
) {
  const serial = data.serial.trim();
  if (!SERIAL_RE.test(serial)) {
    throw new ValidationError('Serial inválido: usa entre 3 y 64 caracteres alfanuméricos');
  }
  const existente = await query<{ id: string; revocado_en: string | null }[]>(
    'SELECT id, revocado_en FROM biometric_devices WHERE LOWER(serial) = LOWER(?)',
    [serial]
  );
  if (existente.length > 0 && existente[0].revocado_en === null) {
    throw new ValidationError('Ese serial ya está vinculado a un equipo activo');
  }
  if (existente.length > 0) {
    await query('DELETE FROM biometric_devices WHERE id = ?', [existente[0].id]);
  }

  const id = crypto.randomUUID();
  await query(
    `INSERT INTO biometric_devices (id, nombre, marca, modelo, serial, ip, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.nombre.trim(),
      data.marca,
      data.modelo?.trim() || null,
      serial,
      data.ip?.trim() || null,
      userId
    ]
  );
  return { id, nombre: data.nombre.trim(), marca: data.marca, serial };
}

export async function listBiometricDevices() {
  return query<
    {
      id: string;
      nombre: string;
      marca: BiometricMarca;
      modelo: string | null;
      serial: string;
      ip: string | null;
      usuario_equipo: string | null;
      mac: string | null;
      recoger_registros: number;
      fecha_crea: string;
      ultimo_uso: string | null;
      revocado_en: string | null;
      activo: boolean;
    }[]
  >(
    `SELECT id, nombre, marca, modelo, serial, ip, usuario_equipo, mac, recoger_registros,
            fecha_crea, ultimo_uso, revocado_en,
            (revocado_en IS NULL) AS activo
       FROM biometric_devices ORDER BY fecha_crea DESC`
  );
}

export async function revokeBiometricDevice(id: string) {
  await query(
    'UPDATE biometric_devices SET revocado_en = CURRENT_TIMESTAMP WHERE id = ? AND revocado_en IS NULL',
    [id]
  );
}
