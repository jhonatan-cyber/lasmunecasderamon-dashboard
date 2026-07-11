import { logger } from './logger';

let notificationAudio: HTMLAudioElement | null = null;

export const playNotificationSound = () => {
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

    notificationAudio.play().catch(() => {
      logger.error('Error al reproducir sonido de notificación');
    });
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
