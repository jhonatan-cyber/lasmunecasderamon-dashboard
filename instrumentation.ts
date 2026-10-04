/**
 * instrumentation.ts — ganchos de arranque del servidor Next.js.
 *
 * Next lo carga una vez por proceso Node (no en el edge). Acá sólo se pide la
 * recepción biométrica al módulo Asistencia: desde la Fase 3 el arranque, su
 * guard anti-recarga y el apagado ordenado viven en el módulo
 * (`arrancarRecepcionBiometrica` / `detenerRecepcionBiometrica`), que es la
 * única dueña de poller, listeners en vivo y vigilancia de IP (riesgo R4).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  try {
    const { arrancarRecepcionBiometrica } = await import('@/modules/asistencia');
    await arrancarRecepcionBiometrica();
    console.log('[instrumentation] Recepción biométrica encendida (poller + listeners + IP watch)');
  } catch (error) {
    console.error('[instrumentation] No se pudo arrancar la recepción biométrica', error);
  }
}
