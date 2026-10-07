/**
 * Qué hacer después de cada código de error.
 *
 * Vive en su propio módulo sin dependencias: la usan `formato.ts` (las
 * herramientas) y `api-client.ts` (el diagnóstico de `verificar_conexion`), y
 * un import desde `formato` a `api-client` crearía un ciclo.
 */
export const SIGUIENTE_PASO: Record<string, string> = {
  CREDENCIALES_FALTANTES:
    'Define MCP_EMAIL y MCP_PASSWORD en la configuración MCP del cliente y reconecta.',
  CREDENCIALES_INVALIDAS:
    'Email o contraseña incorrectos: verifícalos con el administrador del dashboard.',
  CODIGO_TURNO_REQUERIDO:
    'El rol exige código de turno: define MCP_CODIGO con el código del día y reconecta.',
  LOGIN_FALLIDO: 'Revisa los credenciales y, si el rol pide código, MCP_CODIGO.',
  SESION_RECHAZADA:
    'La sesión expiró: reconecta el MCP; si insiste, vuelve a iniciar sesión en el dashboard.',
  SOLO_ADMINISTRADOR: 'Conéctate con una cuenta de administrador activa; el rol del JWT no basta.',
  PERMISOS_INSUFICIENTES:
    'La identidad no tiene ese permiso: pide al administrador que revise el rol o los permisos del módulo.',
  CONEXION_RECHAZADA: 'Comprueba que el dashboard esté levantado en MCP_BASE_URL y vuelve a intentar.',
  TIMEOUT:
    'Reintenta (los GET ya reintentan); si sigue, sube MCP_TIMEOUT_MS o revisa la carga del dashboard.',
  ERROR_RED: 'Revisa la red y MCP_BASE_URL, y confirma que el dashboard responda.',
  RESPUESTA_INVALIDA: 'El dashboard devolvió algo que no es JSON: revisa su log y la ruta llamada.',
  ERROR_HTTP: 'El dashboard respondió con error: lee el mensaje y corrige antes de repetir la llamada.',
  OPERACION_RECHAZADA:
    'El backend rechazó la operación: lee el mensaje, corrige los datos y no repitas la misma clave si habla de idempotencia.',
  ENTRADA_INVALIDA: 'Corrige los argumentos según el inputSchema de la herramienta y vuelve a llamar.',
  ERROR_HERRAMIENTA:
    'Error interno de la herramienta: revisa el mensaje y el log del dashboard antes de reintentar.',
  ERROR_INESPERADO:
    'Fallo sin clasificar: lee el mensaje, revisa el log del dashboard y reintenta sólo si era de lectura.'
};

export const PASO_GENERAL =
  'Lee el mensaje y el estado; en operaciones de dinero no reintentes sin consultar el estado primero.';

const PASO_IDEMPOTENCIA =
  'No reintentes con otra clave: consulta el estado de la operación y, si figura pendiente, espera a que termine antes de decidir.';

/** Paso para un código (y su código de negocio, cuando el backend lo manda). */
export function siguientePaso(codigo: string, codigoNegocio?: string | null): string {
  if (codigoNegocio?.startsWith('IDEMPOTENCY_')) return PASO_IDEMPOTENCIA;
  return SIGUIENTE_PASO[codigo] ?? PASO_GENERAL;
}
