export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { arrancarRecepcionBiometrica, recepcionActiva } = await import('@/modules/asistencia');
      await arrancarRecepcionBiometrica();
      console.log(
        recepcionActiva()
          ? '[instrumentation] Recepción biométrica encendida (poller + listeners + IP watch)'
          : '[instrumentation] Recepción biométrica pausada por configuración'
      );
    } catch (error) {
      console.error('[instrumentation] No se pudo arrancar la recepción biométrica', error);
    }
  }
}
