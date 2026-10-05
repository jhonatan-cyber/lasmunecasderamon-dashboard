import 'server-only';

/**
 * API pública del módulo Asistencia — servidor.
 *
 * Único punto de entrada para rutas HTTP, otros módulos y workflows (§5):
 * marcas y ventana, kioskos, equipos biométricos y el ciclo de vida de la
 * recepción. El interior (`marcas/repositorio`, `kioskos/*`, `biometrico/*`)
 * es privado: la puerta `modulo-solo-api-publica` de
 * `scripts/arquitectura/limites.mjs` falla ante cualquier import que apunte
 * allí desde fuera. Los tipos aptos para cliente viven en `./contracts`.
 */

/* --- Marcas y ventana --- */
export {
  registrarAsistencia,
  listarAsistenciasDeUsuario,
  listarAsistenciasPorFechas,
  listarAsistenciasDeHoy,
  listarMarcasDelDia,
  registrarAsistenciaMasivaDeHoy,
  listarResumenAsistencias,
  registrarAsistenciaManual,
  consultarEstadisticasAsistencia,
  consultarVentana
} from './marcas/servicio';

/* --- Kioskos: credenciales de dispositivo y desafíos de presencia --- */
export {
  KIOSK_COOKIE,
  KIOSK_SESSION_MAX_AGE,
  provisionDevice,
  getKioskDevice,
  renewDevice,
  isDeviceActive,
  revokeDevice,
  listDevices,
  kioskCookieOptions
} from './kioskos/deviceAuth';
export { issueChallenge } from './kioskos/attendanceChallenges';

/* --- Equipos biométricos: lector de la puerta, alta y recepción --- */
export {
  createBiometricDevice,
  listBiometricDevices,
  findActiveDevice,
  touchDevice,
  revokeBiometricDevice
} from './biometrico/deviceAuth';
export { credencialesDeFila, verificarConexion } from './biometrico/deviceClient';
export {
  darDeAltaConFoto,
  estadoEnEquipos,
  fotoEnVivoDelEquipo,
  guardarFotoCapturada,
  guardarCredenciales,
  probarConexion,
  verificarCoincidenciaFacial
} from './biometrico/enrollmentService';
export { desenrolarUsuario } from './biometrico/unenrollmentService';
export { descubrirIpDispositivo } from './biometrico/ipDiscovery';
export { apagarListener, encenderListener } from './biometrico/eventListener';
export { obtenerBytesDeFoto, setRecolector } from './biometrico/servicio';
export type { RecolectorApagado, RecolectorEncendido } from './biometrico/servicio';
export { obtenerEstadoBiometrico } from './biometrico/statusService';
export { openVideoStream } from './biometrico/videoStream';
export { pollEquipo, pollTodos, estaCorriendo } from './biometrico/recordPoller';
export { procesarEventoBiometrico } from './biometrico/processBiometricEvent';
export { parseDahuaPush } from './biometrico/adapters/dahua';
export {
  buildAdmsOptions,
  parseAttlog,
  serialFromParams,
  tableFromParams
} from './biometrico/adapters/zkteco';
export type { BiometricMarca } from './biometrico/types';

/* --- Ciclo de vida de la recepción (Fase 3, R4) --- */
export {
  arrancarRecepcionBiometrica,
  detenerRecepcionBiometrica,
  recepcionActiva
} from './procesos';
