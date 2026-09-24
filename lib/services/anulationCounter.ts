import { createWindowCounter } from '@/lib/cache/redisWindowCounter';

/** Ventana en la que se cuentan las anulaciones de un mismo usuario. */
export const ANULATION_WINDOW_MS = 5 * 60 * 1000;
/** Anulaciones dentro de la ventana que disparan la alerta crítica. */
export const ANULATION_THRESHOLD = 3;

/**
 * Contador de anulaciones por usuario. Vive en Redis para que la alerta por anulaciones
 * masivas no dependa del proceso que atendió cada anulación, con respaldo en memoria.
 */
export const AnulationCounter = createWindowCounter('anulation', {
  windowMs: ANULATION_WINDOW_MS,
  threshold: ANULATION_THRESHOLD
});
