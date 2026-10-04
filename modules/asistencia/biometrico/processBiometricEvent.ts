import { generateUUID, query } from '@/lib/database/db';
import { BaseRepository } from '@/lib/repositories/BaseRepository';
import { getAttendanceConfigHours } from '@/modules/asistencia/marcas/repositorio';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import logger from '@/lib/utils/logger';
import { avisarResultadoEnEquipo } from '@/modules/asistencia/biometrico/avisosAudio';
import type { BiometricEvent, BiometricResultado } from '@/modules/asistencia/biometrico/types';

export interface BiometricOutcome {
  resultado: BiometricResultado;
  usuario?: { id: string; nombre: string; apellido: string };
}

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
    void avisarResultadoEnEquipo(device.id, 'sin_usuario');
    return { resultado: 'sin_usuario' };
  }

  if (Number(usuario.estado) !== 1) {
    await registrarEvento(device, evento, 'usuario_inactivo', usuario.id_usuario);
    return { resultado: 'usuario_inactivo' };
  }

  const fechaHora = getNowInBusinessTimezone();
  const fecha = fechaHora.substring(0, 10);
  const hora = parseInt(fechaHora.substring(11, 13), 10);

  const yaMarcada = await query<{ id_asistencia: string }[]>(
    'SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = ?',
    [usuario.id_usuario, fecha]
  );
  if (yaMarcada.length > 0) {
    await marcarEnLocal(usuario.id_usuario);
    await registrarEvento(device, evento, 'duplicado', usuario.id_usuario);
    await difundirAsistencia('attendance_duplicate', usuario);
    void avisarResultadoEnEquipo(device.id, 'duplicado');
    return { resultado: 'duplicado' };
  }

  const { startHour, endHour } = await getAttendanceConfigHours();
  if (isNaN(hora) || hora < startHour || hora >= endHour) {
    await marcarEnLocal(usuario.id_usuario);
    await registrarEvento(device, evento, 'fuera_ventana', usuario.id_usuario);
    void avisarResultadoEnEquipo(device.id, 'fuera_ventana');
    return { resultado: 'fuera_ventana' };
  }

  await BaseRepository.insert(query, 'asistencias', {
    id_asistencia: generateUUID(),
    usuario_id: usuario.id_usuario,
    fecha,
    hora: fechaHora.substring(11, 19),
    estado: 1,
    origen: 'biometrico',
    biometric_record_id: evento.recordId ?? null
  });
  await marcarEnLocal(usuario.id_usuario);
  await registrarEvento(device, evento, 'registrado', usuario.id_usuario);
  await difundirAsistencia('attendance_registered', usuario);
  void avisarResultadoEnEquipo(device.id, 'registrado');

  return {
    resultado: 'registrado',
    usuario: { id: usuario.id_usuario, nombre: usuario.nombre, apellido: usuario.apellido }
  };
}

async function difundirAsistencia(
  tipo: 'attendance_registered' | 'attendance_duplicate',
  usuario: UsuarioBiometrico
): Promise<void> {
  try {
    const { sendNotificationToAll } = await import('@/lib/api/sseService');
    const payload = {
      user: { id: usuario.id_usuario, nombre: usuario.nombre, apellido: usuario.apellido },
      origen: 'biometrico' as const
    };
    if (tipo === 'attendance_duplicate') {
      sendNotificationToAll('attendance_duplicate', payload);
    } else {
      sendNotificationToAll('attendance_registered', payload);
    }
  } catch (error) {
    logger.error('[biometric] Error difundiendo asistencia por SSE', { error });
  }
}

/**
 * La identificación facial (1:N del servidor) confirmó quién salió en la foto
 * del record: si todavía no marcó hoy y estamos en ventana, crea la asistencia
 * con el record como respaldo — así quien entra sin código también queda.
 * Los negativos y duplicados son silenciosos (el evento por código ya avisó en
 * la puerta) y los records históricos del barrido solo auditan: no acreditan.
 */
export async function atribuirAsistenciaIdentificada(
  usuarioId: string,
  recordId: string,
  deviceId: string,
  fechaDispositivo: Date | string | null
): Promise<'registrado' | 'duplicado' | 'fuera_ventana' | 'fuera_de_alcance' | 'ignorado'> {
  const instante = fechaDispositivo ? new Date(fechaDispositivo).getTime() : NaN;
  if (!Number.isFinite(instante) || Date.now() - instante > 3 * 3_600_000) {
    return 'fuera_de_alcance';
  }

  const filas = await query<UsuarioBiometrico[]>(
    'SELECT id_usuario, nombre, apellido, estado FROM usuarios WHERE id_usuario = ?',
    [usuarioId]
  );
  const usuario = filas[0];
  if (!usuario || Number(usuario.estado) !== 1) return 'ignorado';

  const fechaHora = getNowInBusinessTimezone();
  const fecha = fechaHora.substring(0, 10);
  const hora = parseInt(fechaHora.substring(11, 13), 10);

  const yaMarcada = await query<{ id_asistencia: string }[]>(
    'SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = ?',
    [usuario.id_usuario, fecha]
  );
  if (yaMarcada.length > 0) return 'duplicado';

  const { startHour, endHour } = await getAttendanceConfigHours();
  if (isNaN(hora) || hora < startHour || hora >= endHour) return 'fuera_ventana';

  await BaseRepository.insert(query, 'asistencias', {
    id_asistencia: generateUUID(),
    usuario_id: usuario.id_usuario,
    fecha,
    hora: fechaHora.substring(11, 19),
    estado: 1,
    origen: 'biometrico',
    biometric_record_id: recordId
  });
  await marcarEnLocal(usuario.id_usuario);
  await difundirAsistencia('attendance_registered', usuario);
  void avisarResultadoEnEquipo(deviceId, 'registrado');
  return 'registrado';
}

interface UsuarioBiometrico {
  id_usuario: string;
  nombre: string;
  apellido: string;
  estado: number;
}

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
    logger.error('[biometric] Error guardando evento de auditoria', { error });
  }
}
