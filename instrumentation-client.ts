import { createRegistrationFetch } from '@/lib/api/registrationFetch';
import { z } from 'zod';

// La CSP de producción prohíbe eval: evita que Zod pruebe su compilador JIT.
z.config({ jitless: true });

// Se instala antes de hidratar para cubrir formularios, modales y mutaciones compartidas.
let storage: Storage | undefined;
try {
  storage = window.sessionStorage;
} catch {
  /* Navegacion con almacenamiento restringido. */
}
window.fetch = createRegistrationFetch(window.fetch.bind(window), window.location.origin, storage);
