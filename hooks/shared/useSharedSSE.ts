// Alias histórico de `useSSE`: ambos hooks resolvían el mismo ciclo de
// suscripción y reconexión. Se conserva el nombre para no tocar a sus
// consumidores.
export { useSSE as useSharedSSE } from './useSSE';
