import crypto from 'crypto';

const ALGORITMO = 'aes-256-gcm';
const IV_BYTES = 12;

let claveCacheada: Buffer | null = null;
let claveResuelta = false;

function resolverClave(): Buffer {
  if (claveResuelta) return claveCacheada as Buffer;
  const valor = (process.env.BIOMETRIC_ENCRYPTION_KEY || '').trim();
  if (!valor) throw new Error('BIOMETRIC_ENCRYPTION_KEY no está configurada');
  const clave = Buffer.from(valor, 'base64');
  if (clave.length !== 32) {
    throw new Error('BIOMETRIC_ENCRYPTION_KEY debe ser 32 bytes (base64)');
  }
  claveCacheada = clave;
  claveResuelta = true;
  return clave;
}

export function generarClaveCifrado(): string {
  return crypto.randomBytes(32).toString('base64');
}

export function cifrarSecreto(textoPlano: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITMO, resolverClave(), iv);
  const datos = Buffer.concat([cipher.update(textoPlano, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), datos.toString('base64')].join('.');
}

export function descifrarSecreto(guardado: string): string {
  const partes = guardado.split('.');
  if (partes.length !== 3) throw new Error('Formato de secreto cifrado inválido');
  const decipher = crypto.createDecipheriv(
    ALGORITMO,
    resolverClave(),
    Buffer.from(partes[0], 'base64')
  );
  decipher.setAuthTag(Buffer.from(partes[1], 'base64'));
  const datos = Buffer.concat([
    decipher.update(Buffer.from(partes[2], 'base64')),
    decipher.final()
  ]);
  return datos.toString('utf8');
}
