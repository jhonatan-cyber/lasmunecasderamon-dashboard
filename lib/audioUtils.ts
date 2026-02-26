/**
 * Utilidades para notificaciones sonoras y por voz
 */

export const playNotificationSound = () => {
    try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('No se pudo reproducir sonido:', e));
    } catch (error) {
        console.log('Audio no disponible');
    }
};

export const announceVoice = (message: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
            window.speechSynthesis.cancel();
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
