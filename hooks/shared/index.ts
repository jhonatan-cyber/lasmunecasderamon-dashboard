/**
 * Infraestructura genérica reutilizable por cualquier dominio.
 *
 * Solo entra aquí lo que no pertenece a un dominio concreto: acceso a
 * configuración, primitivas de datos, mutaciones, estado de UI y transporte
 * en tiempo real. Los hooks con reglas de negocio viven en la carpeta de su
 * dominio (`ventas/`, `servicios/`, `cuentas/`, `traspasos/`, `calendario/`).
 */
export {
  cargarConfiguraciones,
  refrescarConfiguraciones,
  useConfig,
  useConfigValue,
  valorDeConfig
} from './useConfigValue';
export { useConfirmModal } from './useConfirmModal';
export { useGenericFetch } from './useGenericFetch';
export { useGenericFilters } from './useGenericFilters';
export { useGenericMutations } from './useGenericMutations';
export { useMasterData } from './useMasterData';
export { useNumberFormatter } from './useNumberFormatter';
export { usePersistentTab } from './usePersistentTab';
export { useRefreshOnFocus } from './useRefreshOnFocus';
export { useSharedSSE } from './useSharedSSE';
export { useSingleFlight } from './useSingleFlight';
export { useSSE } from './useSSE';
