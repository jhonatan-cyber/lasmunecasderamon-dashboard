/**
 * Stub de `server-only` para las suites de vitest.
 *
 * El paquete real lanza "This module cannot be imported from a Client
 * Component module" salvo bajo la condición `react-server`, que sólo define
 * Next.js en un React Server Component — Vitest resuelve la condición
 * `default` y recibiría el throw. Ambas configs de vitest (unit y postgres)
 * sustituyen este archivo por `server-only` vía `resolve.alias`; en producción
 * el import protege la API pública de los módulos.
 */
export {};
