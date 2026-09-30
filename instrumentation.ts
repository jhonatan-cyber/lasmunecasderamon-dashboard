/**
 * instrumentation.ts — ganchos de arranque del servidor Next.js.
 *
 * Next lo carga una vez por proceso Node (no en el edge). Acá encendemos la
 * recepción en tiempo real de verificaciones biométricas:
 *   - Listener en vivo por equipo (`eventManager.cgi?action=attach`): cada
 *     verificación llega al instante y la asistencia se registra sub-segundo.
 *   - Poller de 1 minuto como red de seguridad (eventos que el stream pudo
 *     perder mientras el servidor estuvo caído).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  try {
    const { arrancarPoller } = await import('@/lib/biometric/recordPoller');
    arrancarPoller();
    const { encenderTodos } = await import('@/lib/biometric/eventListener');
    await encenderTodos();
  } catch (error) {
    console.error('[instrumentation] No se pudo arrancar la recepción biométrica', error);
  }
}
