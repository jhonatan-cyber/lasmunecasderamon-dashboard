import { createRegistrationFetch } from '@/lib/api/registrationFetch';

// Se instala antes de hidratar para cubrir formularios, modales y mutaciones compartidas.
let storage: Storage | undefined;
try {
  storage = window.sessionStorage;
} catch {
  /* Navegacion con almacenamiento restringido. */
}
window.fetch = createRegistrationFetch(window.fetch.bind(window), window.location.origin, storage);
