import crypto from 'crypto';
import { generateUUID } from '@/lib/database/db';
import logger from '@/lib/utils/logger';
import {
  buscarDesafioPorHash,
  canjearDesafio,
  contarDesafiosVigentes,
  eliminarDesafio,
  reemplazarDesafioUsuario,
  type DesafioAsistenciaRow
} from './repositorio';

/**
 * Desafío de asistencia: la prueba de presencia que verifica el servidor.
 *
 * Reemplaza al token personal que se publicaba en /api/public/users. El token se genera
 * acá, se guarda hasheado y solo lo puede emitir una superficie del local:
 *
 *  - `kiosk`  → la pantalla de la entrada, autoservicio. El desafío lo canjea su dueño.
 *  - `usuario:<id>` → la pantalla de asistencia del personal (cola/mostrador).
 *    Puede canjearlo el dueño o quien lo emitió, porque en el mostrador el cajero
 *    escanea por el empleado y esa identidad queda registrada.
 *
 * Un solo desafío activo por persona: emitir uno nuevo invalida el anterior, así que
 * el QR que se muestra en pantalla es siempre el vigente.
 */

export const CHALLENGE_TTL_SECONDS = 120;

/** 24 bytes en base64url: 32 caracteres, aptos para viajar en un QR. */
export function buildChallengeToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

export function hashChallengeToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export type ChallengeIssuer =
  { kind: 'kiosk'; deviceId: string } | { kind: 'user'; userId: string };

export interface IssuedChallenge {
  token: string;
  expiraEn: string;
  ttlSegundos: number;
}

function issuerLabel(issuer: ChallengeIssuer): string {
  return issuer.kind === 'kiosk' ? `kiosko:${issuer.deviceId}` : `usuario:${issuer.userId}`;
}

export async function issueChallenge(
  usuarioId: string,
  issuer: ChallengeIssuer
): Promise<IssuedChallenge> {
  const token = buildChallengeToken();
  const expiraEn = new Date(Date.now() + CHALLENGE_TTL_SECONDS * 1000).toISOString();

  await reemplazarDesafioUsuario({
    id: generateUUID(),
    usuarioId,
    tokenHash: hashChallengeToken(token),
    emitidoPor: issuerLabel(issuer),
    emisorUsuarioId: issuer.kind === 'user' ? issuer.userId : null,
    expiraEn
  });

  return { token, expiraEn, ttlSegundos: CHALLENGE_TTL_SECONDS };
}

export type ChallengeFailure = 'no_existe' | 'vencido' | 'ya_usado' | 'no_autorizado';

export const CHALLENGE_FAILURE_MESSAGES: Record<ChallengeFailure, string> = {
  no_existe: 'Código inválido. Pedí uno nuevo en la pantalla de asistencia.',
  vencido: 'El código venció. Generá uno nuevo en la pantalla de asistencia.',
  ya_usado: 'Ese código ya se usó. Generá uno nuevo en la pantalla de asistencia.',
  no_autorizado: 'Este código fue emitido para otra persona en la pantalla del local.'
};

export type RedemptionResult =
  { ok: true; usuarioId: string } | { ok: false; motivo: ChallengeFailure };

/**
 * Canjea un desafío. El canje en sí es una sola sentencia atómica: si dos peticiones
 * llegan con el mismo token, solo una toca la fila (la otra ve `usado_en` no nulo).
 */
export async function redeemChallenge(
  token: string,
  currentUserId: string
): Promise<RedemptionResult> {
  const rows = await canjearDesafio(hashChallengeToken(token), currentUserId);

  if (rows.length > 0) {
    return { ok: true, usuarioId: String(rows[0].usuario_id) };
  }

  // No se canjeó: se explica por qué, para poder decirle algo útil a la persona.
  const existentes: DesafioAsistenciaRow[] = await buscarDesafioPorHash(hashChallengeToken(token));

  if (existentes.length === 0) return { ok: false, motivo: 'no_existe' };

  const desafio = existentes[0];
  if (desafio.usado_en) return { ok: false, motivo: 'ya_usado' };

  const vencido = new Date(desafio.expira_en).getTime() <= Date.now();
  if (vencido) {
    await eliminarDesafio(desafio.id_desafio);
    return { ok: false, motivo: 'vencido' };
  }

  logger.warn('[attendanceChallenges] canje rechazado por autoría', {
    usuario_id: desafio.usuario_id,
    intento_de: currentUserId
  });
  return { ok: false, motivo: 'no_autorizado' };
}

/** Desafíos vigentes sin canjear de una persona (diagnóstico y pruebas). */
export async function countActiveChallenges(usuarioId: string): Promise<number> {
  return contarDesafiosVigentes(usuarioId);
}
