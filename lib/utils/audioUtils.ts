import { logger } from './logger';

let notificationAudio: HTMLAudioElement | null = null;
let scanAudio: AudioContext | null = null;

/** Contexto de Web Audio del escaneo, creado una sola vez por pestaña. */
const scanContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    if (!scanAudio) scanAudio = new Ctor();
    return scanAudio;
  } catch {
    return null;
  }
};

/**
 * Reanuda el audio en el gesto del usuario: los navegadores dejan el contexto
 * suspendido hasta la primera interacción, así que sin esto el primer escaneo
 * del lote podría quedar mudo.
 */
export const prepareScanSound = () => {
  const contexto = scanContext();
  if (contexto?.state === 'suspended') void contexto.resume();
};

/** Los tres estados posibles de una lectura del control de envases. */
export type AvisoEscaneo = 'aceptado' | 'rechazado' | 'cola';

/**
 * Aviso del control de envases con tres timbres distintos: agudo y corto cuando
 * el escaneo se acepta, grave y descendente cuando se rechaza, y dos pulsos en
 * tono medio cuando queda guardado sin verificar (sin conexión). Se genera con
 * Web Audio (sin archivos) para que responda al instante en el escaneo
 * continuo, donde el operador no mira la pantalla en cada lectura.
 */
export const playScanSound = (tipo: AvisoEscaneo) => {
  try {
    const contexto = scanContext();
    if (!contexto) return;
    if (contexto.state === 'suspended') void contexto.resume();

    const ahora = contexto.currentTime;
    const oscilador = contexto.createOscillator();
    const volumen = contexto.createGain();
    oscilador.connect(volumen);
    volumen.connect(contexto.destination);

    if (tipo === 'aceptado') {
      oscilador.type = 'sine';
      oscilador.frequency.setValueAtTime(1180, ahora);
      volumen.gain.setValueAtTime(0.0001, ahora);
      volumen.gain.exponentialRampToValueAtTime(0.16, ahora + 0.012);
      volumen.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.16);
      oscilador.start(ahora);
      oscilador.stop(ahora + 0.18);
      return;
    }

    if (tipo === 'rechazado') {
      oscilador.type = 'square';
      oscilador.frequency.setValueAtTime(240, ahora);
      oscilador.frequency.exponentialRampToValueAtTime(150, ahora + 0.28);
      volumen.gain.setValueAtTime(0.0001, ahora);
      volumen.gain.exponentialRampToValueAtTime(0.2, ahora + 0.012);
      volumen.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.3);
      oscilador.start(ahora);
      oscilador.stop(ahora + 0.32);
      return;
    }

    // 'cola': dos pulsos cortos en tono medio, sin subir ni bajar: nada se
    // resolvió todavía, el escaneo solo quedó guardado localmente.
    oscilador.type = 'triangle';
    oscilador.frequency.setValueAtTime(700, ahora);
    volumen.gain.setValueAtTime(0.0001, ahora);
    volumen.gain.exponentialRampToValueAtTime(0.14, ahora + 0.012);
    volumen.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.09);
    volumen.gain.exponentialRampToValueAtTime(0.14, ahora + 0.112);
    volumen.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.2);
    oscilador.start(ahora);
    oscilador.stop(ahora + 0.22);
  } catch {
    logger.error('Error al reproducir el aviso del escaneo de envases');
  }
};

/**
 * `play()` se rechaza sin que haya un fallo cuando el navegador todavía no
 * tuvo gesto del usuario (política de autoplay) o cuando una pausa interrumpe
 * la reproducción en curso. Eso no es un error del audio.
 */
function esRechazoEsperadoDeAudio(error: unknown): boolean {
  const nombre = error instanceof Error ? error.name : '';
  return nombre === 'NotAllowedError' || nombre === 'AbortError';
}

/** Motivo del fallo para el log: `NotSupportedError: …` en vez de un objeto vacío. */
function detalleDeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/**
 * Un solo reintento automático: los oyentes se dan de baja en el primer gesto
 * y, si ese intento también se bloquea, no se vuelve a encolar (así el sonido
 * no salta en cada clic del operador).
 */
let notificacionEsperandoGesto = false;

function reproducirEnPrimerGesto(): void {
  if (notificacionEsperandoGesto || typeof window === 'undefined') return;
  notificacionEsperandoGesto = true;
  const alGestar = () => {
    window.removeEventListener('pointerdown', alGestar);
    window.removeEventListener('keydown', alGestar);
    window.removeEventListener('touchend', alGestar);
    playNotificationSound();
  };
  window.addEventListener('pointerdown', alGestar);
  window.addEventListener('keydown', alGestar);
  window.addEventListener('touchend', alGestar);
}

export const playNotificationSound = () => {
  if (typeof window === 'undefined') return;
  try {
    if (!notificationAudio) {
      notificationAudio = new Audio('/notification.mp3');
      notificationAudio.volume = 0.5;
      notificationAudio.preload = 'auto';
    }

    if (!notificationAudio.paused) {
      notificationAudio.pause();
      notificationAudio.currentTime = 0;
    }

    void Promise.resolve(notificationAudio.play()).then(
      () => {
        // Arrancó: el próximo bloqueo vuelve a poder encolarse en un gesto.
        notificacionEsperandoGesto = false;
      },
      (error: unknown) => {
        if (esRechazoEsperadoDeAudio(error)) {
          logger.debug('Sonido de notificación pendiente del gesto del usuario');
          reproducirEnPrimerGesto();
          return;
        }
        notificacionEsperandoGesto = false;
        logger.error('Error al reproducir sonido de notificación', {
          detalle: detalleDeError(error)
        });
      }
    );
  } catch (error) {
    notificacionEsperandoGesto = false;
    logger.error('Error al reproducir sonido de notificación', {
      detalle: detalleDeError(error)
    });
  }
};

export const announceVoice = (message: string) => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'es-ES';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      logger.error('Error al reproducir voz');
    }
  }
};

export const announcePriority = (message: string) => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'es-ES';
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    } catch {
      logger.error('Error al reproducir voz');
    }
  }
};
