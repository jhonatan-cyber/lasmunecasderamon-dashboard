import { Howl } from 'howler';
import { logger } from './logger';


let notificationSound: Howl | null = null;

export const playNotificationSound = () => {
  try {
    if (!notificationSound) {
      notificationSound = new Howl({
        src: ['/notification.mp3'],
        volume: 0.5,
        html5: true,
        preload: true,
      });
    }

    if (notificationSound.playing()) {
      notificationSound.stop();
    }

    notificationSound.play();
  } catch {

    logger.error('Error al reproducir sonido de notificación');
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
