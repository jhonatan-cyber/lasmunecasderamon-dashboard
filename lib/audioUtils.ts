import { Howl } from 'howler';

/**
 * Utilidades para notificaciones sonoras y por voz usando Howler.js
 */

// Instancia única para el sonido de notificación
let notificationSound: Howl | null = null;

export const playNotificationSound = () => {
    try {
        if (!notificationSound) {
            notificationSound = new Howl({
                src: ['/notification.mp3'],
                volume: 0.5,
                html5: true, // Usar HTML5 Audio para mayor compatibilidad con archivos largos o streaming si fuera necesario
                preload: true
            });
        }

        // Detener si ya se estaba reproduciendo (para evitar eco) y volver a empezar
        if (notificationSound.playing()) {
            notificationSound.stop();
        }

        notificationSound.play();
    } catch (error) {
        console.log('Error al reproducir audio con Howler:', error);
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
        } catch (error) {
            console.error('Error en síntesis de voz:', error);
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
            utterance.pitch = 1.1; // Tono un poco más alto para urgencia
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('Error en síntesis de voz prioritaria:', error);
        }
    }
};
