import crypto from 'crypto';
import { ValidationError } from '@/lib/errors/errors';
import type { BiometricMarca } from '@/modules/asistencia/biometrico/types';
import {
  actualizarUltimoUsoDispositivo,
  buscarDispositivoPorSerial,
  crearDispositivoBiometrico,
  eliminarDispositivoBiometrico,
  listarDispositivosBiometricos,
  listarDispositivosPorSerial,
  revocarDispositivoBiometrico
} from './repositorio';

const SERIAL_RE = /^[a-zA-Z0-9._:-]{3,64}$/;

export async function findActiveDevice(serial: string) {
  const limpio = serial.trim();
  if (!SERIAL_RE.test(limpio)) return null;
  const rows = await buscarDispositivoPorSerial<{
    id: string;
    nombre: string;
    marca: BiometricMarca;
    serial: string;
  }>(limpio);
  return rows[0] ?? null;
}

export async function touchDevice(id: string) {
  await actualizarUltimoUsoDispositivo(id);
}

export async function createBiometricDevice(
  data: { nombre: string; marca: BiometricMarca; modelo?: string; serial: string; ip?: string },
  userId: string
) {
  const serial = data.serial.trim();
  if (!SERIAL_RE.test(serial)) {
    throw new ValidationError('Serial inválido: usa entre 3 y 64 caracteres alfanuméricos');
  }
  const existente = await listarDispositivosPorSerial<{ id: string; revocado_en: string | null }>(
    serial
  );
  if (existente.length > 0 && existente[0].revocado_en === null) {
    throw new ValidationError('Ese serial ya está vinculado a un equipo activo');
  }
  if (existente.length > 0) {
    await eliminarDispositivoBiometrico(existente[0].id);
  }

  const id = crypto.randomUUID();
  await crearDispositivoBiometrico({
    id,
    nombre: data.nombre.trim(),
    marca: data.marca,
    modelo: data.modelo?.trim() || null,
    serial,
    ip: data.ip?.trim() || null,
    creadoPor: userId
  });
  return { id, nombre: data.nombre.trim(), marca: data.marca, serial };
}

export async function listBiometricDevices() {
  return listarDispositivosBiometricos<{
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
  }>();
}

export async function revokeBiometricDevice(id: string) {
  await revocarDispositivoBiometrico(id);
}
