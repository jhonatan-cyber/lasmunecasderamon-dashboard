import { generateUUID, query } from '@/lib/database/db';
import { BaseRepository } from '@/lib/repositories/BaseRepository';
import { getAttendanceConfigHours } from '@/lib/repositories/attendance/AttendanceQueries';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import logger from '@/lib/utils/logger';
import type { BiometricDevice, BiometricEvent, BiometricResultado } from '@/lib/biometric/types';

export interface BiometricOutcome {
  resultado: BiometricResultado;
  usuario?: { id: string; nombre: string; apellido: string };
}

/**
 * Convierte la verificación del equipo en una asistencia, con las mismas reglas
 * que el resto de las vias (QR, codigo de 4 digitos):
 *
 *  - una sola asistencia por persona y dia (reenvio del equipo = `duplicado`);
 *  - fuera de `asistencia_hora_inicio`/`fin` solo se registra la ubicacion
 *    (`fuera_ventana`), igual que hace `registerAttendance`;
 *  - al registrar, se difunde `attendance_registered` para que la pantalla del
 *    local refresque al instante.
 *
 * Todo —también lo que no se puede acreditar— queda en `biometric_events`.
 */
export async function procesarEventoBiometrico(
  evento: BiometricEvent,
  device: { id: string; serial: string }
): Promise<BiometricOutcome> {
  const usuario = await resolverUsuario(evento.codigo);

  if (!usuario) {
    await registrarEvento(device, evento, 'sin_usuario', null);
    logger.warn('[biometric] Codigo sin usuario', {
      serial: device.serial,
      codigo: evento.codigo
    });
    return { resultado: 'sin_usuario' };
  }

  if (Number(usuario.estado) !== 1) {
    await registrarEvento(device, evento, 'usuario_inactivo', usuario.id_usuario);
    return { resultado: 'usuario_inactivo' };
  }

  const fechaHora = normalizarFechaHora(evento.fechaDispositivo ?? getNowInBusinessTimezone());
  const fecha = fechaHora.substring(0, 10);
  const hora = parseInt(fechaHora.substring(11, 13), 10);

  const yaMarcada = await query<{ id_asistencia: string }[]>(
    'SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = ?',
    [usuario.id_usuario, fecha]
  );
  if (yaMarcada.length > 0) {
    await marcarEnLocal(usuario.id_usuario);
    await registrarEvento(device, evento, 'duplicado', usuario.id_usuario);
    return { resultado: 'duplicado' };
  }

  const { startHour, endHour } = await getAttendanceConfigHours();
  if (isNaN(hora) || hora < startHour || hora >= endHour) {
    await marcarEnLocal(usuario.id_usuario);
    await registrarEvento(device, evento, 'fuera_ventana', usuario.id_usuario);
    return { resultado: 'fuera_ventana' };
  }

  await BaseRepository.insert(query, 'asistencias', {
    id_asistencia: generateUUID(),
    usuario_id: usuario.id_usuario,
    fecha,
    hora: fechaHora.substring(11, 19),
    estado: 1,
    origen: 'biometrico'
  });
  await marcarEnLocal(usuario.id_usuario);
  await registrarEvento(device, evento, 'registrado', usuario.id_usuario);

  const payload = {
    user: { id: usuario.id_usuario, nombre: usuario.nombre, apellido: usuario.apellido }
  };
  try {
    const { sendNotificationToAll } = await import('@/lib/api/sseService');
    sendNotificationToAll('attendance_registered', payload);
  } catch (error) {
    logger.error('[biometric] Error difundiendo asistencia por SSE', { error });
  }

  return {
    resultado: 'registrado',
    usuario: { id: usuario.id_usuario, nombre: usuario.nombre, apellido: usuario.apellido }
  };
}

interface UsuarioBiometrico {
  id_usuario: string;
  nombre: string;
  apellido: string;
  estado: number;
}

/**
 * El equipo reporta su propio PIN: puede venir con ceros a la izquierda
 * (`00012`) o con el código tal cual se cargó (`12`). Se prueban las dos formas.
 */
async function resolverUsuario(codigo: string): Promise<UsuarioBiometrico | null> {
  const limpio = codigo.trim();
  if (!limpio) return null;
  const candidatos = [limpio];
  if (/^0\d+$/.test(limpio)) candidatos.push(String(parseInt(limpio, 10)));

  for (const candidato of candidatos) {
    const rows = await query<UsuarioBiometrico[]>(
      `SELECT id_usuario, nombre, apellido, estado FROM usuarios
        WHERE biometrico_codigo IS NOT NULL AND TRIM(biometrico_codigo) <> ''
          AND LOWER(TRIM(biometrico_codigo)) = LOWER(?)`,
      [candidato]
    );
    if (rows.length > 0) return rows[0];
  }
  return null;
}

async function marcarEnLocal(usuarioId: string) {
  await BaseRepository.update(query, 'logins', 'usuario_id', usuarioId, { en_local: 1 });
}

/** `2026-09-29 21:30` → `2026-09-29 21:30:00` (formato que ya usa `asistencias.hora`). */
function normalizarFechaHora(valor: string): string {
  const match = valor.trim().match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)/);
  if (!match) return getNowInBusinessTimezone();
  const hora = match[2].length === 5 ? `${match[2]}:00` : match[2];
  return `${match[1]} ${hora}`;
}

async function registrarEvento(
  device: { id: string; serial: string },
  evento: BiometricEvent,
  resultado: BiometricResultado,
  usuarioId: string | null
) {
  try {
    await BaseRepository.insert(query, 'biometric_events', {
      id: generateUUID(),
      device_id: device.id,
      serial: device.serial,
      codigo_persona: evento.codigo.substring(0, 64),
      fecha_dispositivo: evento.fechaDispositivo,
      metodo: evento.metodo,
      usuario_id: usuarioId,
      resultado,
      payload: evento.raw.substring(0, 2000)
    });
  } catch (error) {
    // La auditoria nunca debe tumbar el registro de asistencia.
    logger.error('[biometric] Error guardando evento de auditoria', { error });
  }
}
