/**
 * Configuración de WhatsApp por administrador.
 *
 * Cada administrador guarda su destino (el WhatsApp donde recibe los avisos) y,
 * opcionalmente, sus propias credenciales de Twilio. Al notificar se envía a
 * todos los administradores activos —cada uno por su cuenta y a su número—, y si
 * no hay ninguno configurado se cae al número/credenciales globales (el `.env` o
 * los campos de Configuraciones → WhatsApp).
 *
 * Las credenciales por admin son opcionales: vacías significan "usar las
 * globales". Así un solo Twilio compartido sirve para varios destinatarios.
 */
import { getAdminWhatsApp } from '@/lib/business/whatsappConfig';
import { getTwilioConfig } from '@/lib/business/twilioConfig';
import * as repo from './administradoresRepositorio';

/** Lo que el GET devuelve en vez del Auth Token real: es un secreto. */
export const AUTH_TOKEN_MASK = '••••••••••••';

/** Un destinatario concreto de un aviso. */
export interface DestinoWhatsApp {
  usuarioId: string | null;
  nombre: string;
  accountSid: string;
  authToken: string;
  whatsappNumber: string;
  destino: string;
}

/** Credenciales de Twilio que pueden firmar un callback entrante. */
export interface CredencialesTwilio {
  accountSid: string;
  authToken: string;
}

function limpio(valor: string | null | undefined): string {
  return (valor || '').replace('whatsapp:', '').trim();
}

function sinPrefijo(valor: string | null | undefined): string {
  return (valor || '').trim();
}

/**
 * Destinatarios de un aviso al administrador.
 *
 * Con administradores configurados devuelve uno por fila activa (cada uno con sus
 * credenciales, o las globales si las dejó vacías). Sin ninguno, devuelve un único
 * destino con el número y credenciales globales para no romper el comportamiento
 * anterior.
 */
export async function resolverDestinosWhatsApp(): Promise<DestinoWhatsApp[]> {
  const global = await getTwilioConfig();
  const activos = await repo.listarAdministradoresActivos();

  const destinos = activos
    .map(admin => ({
      usuarioId: admin.usuarioId,
      nombre: `${admin.nombre} ${admin.apellido}`.trim(),
      accountSid: sinPrefijo(admin.accountSid) || global.accountSid,
      authToken: sinPrefijo(admin.authToken) || global.authToken,
      whatsappNumber: limpio(admin.whatsappNumber) || global.whatsappNumber,
      destino: limpio(admin.destino)
    }))
    .filter(destino => destino.destino);

  if (destinos.length > 0) return destinos;

  const numeroGlobal = await getAdminWhatsApp();
  if (!numeroGlobal) return [];
  return [
    {
      usuarioId: null,
      nombre: 'Administrador',
      accountSid: global.accountSid,
      authToken: global.authToken,
      whatsappNumber: global.whatsappNumber,
      destino: limpio(numeroGlobal)
    }
  ];
}

/** Números autorizados a responder por WhatsApp (administradores o el global). */
export async function numerosAdministradores(): Promise<Set<string>> {
  const activos = await repo.listarAdministradoresActivos();
  const numeros = new Set(activos.map(admin => limpio(admin.destino)).filter(Boolean));
  if (numeros.size === 0) {
    const global = await getAdminWhatsApp();
    if (global) numeros.add(limpio(global));
  }
  return numeros;
}

/** Pares (Account SID, Auth Token) que pueden haber firmado un callback entrante. */
export async function credencialesParaWebhook(): Promise<CredencialesTwilio[]> {
  const global = await getTwilioConfig();
  const activos = await repo.listarAdministradoresActivos();
  const configs: CredencialesTwilio[] = activos.map(admin => ({
    accountSid: sinPrefijo(admin.accountSid) || global.accountSid,
    authToken: sinPrefijo(admin.authToken) || global.authToken
  }));
  configs.push({ accountSid: global.accountSid, authToken: global.authToken });
  const vistos = new Set<string>();
  return configs.filter(c => {
    if (!c.accountSid || !c.authToken) return false;
    const clave = `${c.accountSid}:${c.authToken}`;
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}

/** Configuración guardada de cada administrador, con el token enmascarado. */
export async function listarConfigAdministradores() {
  const filas = await repo.listarAdministradoresWhatsApp();
  return filas.map(fila => ({
    usuarioId: fila.usuarioId,
    nombre: `${fila.nombre} ${fila.apellido}`.trim(),
    nick: fila.nick,
    destino: fila.destino,
    accountSid: fila.accountSid || '',
    authToken: fila.authToken ? AUTH_TOKEN_MASK : '',
    whatsappNumber: fila.whatsappNumber || '',
    activo: fila.activo === 1
  }));
}

/** Administradores activos del sistema que todavía no tienen configuración. */
export async function listarAdministradoresDisponibles() {
  const [admins, configurados] = await Promise.all([
    repo.listarUsuariosAdministradores(),
    repo.listarAdministradoresWhatsApp()
  ]);
  const yaConfigurados = new Set(configurados.map(fila => fila.usuarioId));
  return admins
    .filter(admin => !yaConfigurados.has(admin.id))
    .map(admin => ({
      id: admin.id,
      nombre: `${admin.nombre} ${admin.apellido}`.trim(),
      nick: admin.nick
    }));
}

export interface EntradaAdminWhatsApp {
  destino: string;
  accountSid?: string;
  authToken?: string;
  whatsappNumber?: string;
  activo?: boolean;
}

const NUMERO = /^\+?\d{7,15}$/;
const SID = /^AC[0-9a-f]{32}$/i;
const TOKEN = /^[A-Za-z0-9_-]{16,128}$/;

/** Valida y guarda la configuración de un administrador. Devuelve el error o `null`. */
export async function guardarConfigAdministrador(
  usuarioId: string,
  entrada: EntradaAdminWhatsApp
): Promise<string | null> {
  if (!usuarioId) return 'Falta el administrador';
  if (!(await repo.esUsuarioAdministrador(usuarioId))) {
    return 'Solo un usuario con rol administrador puede configurar WhatsApp';
  }

  const destino = limpio(entrada.destino);
  if (!NUMERO.test(destino))
    return 'El WhatsApp de destino debe ser un número válido (ej: 56987904824)';

  const accountSid = sinPrefijo(entrada.accountSid);
  if (accountSid && !SID.test(accountSid)) {
    return 'El Account SID debe empezar con AC y tener 32 caracteres';
  }

  const whatsappNumber = limpio(entrada.whatsappNumber);
  if (whatsappNumber && !NUMERO.test(whatsappNumber)) {
    return 'El número de origen debe ser un número válido (ej: whatsapp:+14155238886)';
  }

  // El token llega enmascarado (o vacío) cuando no se tocó: se conserva el guardado.
  const actual = await repo.obtenerAdministradorWhatsApp(usuarioId);
  let authToken = sinPrefijo(entrada.authToken);
  if (!authToken || authToken === AUTH_TOKEN_MASK) {
    authToken = actual?.authToken ?? '';
  }
  if (authToken && authToken !== AUTH_TOKEN_MASK && !TOKEN.test(authToken)) {
    return 'El Auth Token de Twilio no parece válido (mínimo 16 caracteres)';
  }

  await repo.guardarAdministradorWhatsApp(usuarioId, {
    destino,
    accountSid: accountSid || null,
    authToken: authToken || null,
    whatsappNumber: whatsappNumber || null,
    activo: entrada.activo !== false
  });
  return null;
}

export async function eliminarConfigAdministrador(usuarioId: string): Promise<void> {
  await repo.eliminarAdministradorWhatsApp(usuarioId);
}
