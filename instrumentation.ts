/**
 * instrumentation.ts — ganchos de arranque del servidor Next.js.
 *
 * Next lo carga una vez por proceso Node (no en el edge). Acá encendemos la
 * recepción en tiempo real de verificaciones biométricas:
 *   - Listener en vivo por equipo (`eventManager.cgi?action=attach`): cada
 *     verificación llega al instante y la asistencia se registra sub-segundo.
 *   - Poller de 1 minuto como red de seguridad (eventos que el stream pudo
 *     perder mientras el servidor estuvo caído).
 *   - Vigilante de IP: si el DHCP le cambia la IP al terminal, lo re-encuentra
 *     por su MAC y actualiza `biometric_devices.ip` sin tocar la identidad.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  try {
    const { arrancarPoller } = await import('@/lib/biometric/recordPoller');
    arrancarPoller();
    const { encenderTodos } = await import('@/lib/biometric/eventListener');
    await encenderTodos();
    const { arrancarVigilanteIp } = await import('@/lib/biometric/ipWatcher');
    arrancarVigilanteIp();
    console.log('[instrumentation] Recepción biométrica encendida (poller + listeners + IP watch)');
  } catch (error) {
    console.error('[instrumentation] No se pudo arrancar la recepción biométrica', error);
  }
}
