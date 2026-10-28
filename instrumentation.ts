export async function register() {
  // El import debe quedar directo dentro de esta rama: Next compila la
  // instrumentación también para Edge y poda el bloque al saber el runtime.
  // Envolverlo en un callback hacía que Edge arrastrara todo el módulo Node.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Los lectores físicos están apagados por defecto: poller, listeners en vivo
  // y vigilancia de IP sólo arrancan si se pide explícitamente. El import de la
  // recepción cuesta segundos en un arranque en frío, así que ni siquiera se
  // carga cuando nadie va a escuchar lectores. El enrolamiento facial desde el
  // teléfono no depende de esto: lo atiende /api/users/[id]/biometric/captures
  // bajo demanda.
  if ((process.env.BIOMETRIC_RECEPTION ?? '').toLowerCase() !== 'on') {
    console.warn('[instrumentation] Recepción de lectores biométricos desactivada');
    return;
  }

  try {
    // Fachada angosta a propósito: importar `@/modules/asistencia`
    // arrastraba todo el barrel (facial, video, kioscos) al arranque.
    const { arrancarRecepcionBiometrica, recepcionActiva } =
      await import('@/modules/asistencia/recepcion');

    // `register()` debe completarse antes de que Next atienda requests. La
    // recepción consulta la base y enciende subsistemas que no hacen falta
    // para responder: se ejecuta fuera del camino crítico. Si PostgreSQL o el
    // lector tardan, el dashboard ya está disponible.
    setTimeout(() => {
      void arrancarRecepcionBiometrica()
        .then(() => {
          console.log(
            recepcionActiva()
              ? '[instrumentation] Recepción biométrica encendida (poller + listeners + IP watch)'
              : '[instrumentation] Recepción biométrica pausada por configuración'
          );
        })
        .catch(error => {
          console.error('[instrumentation] No se pudo arrancar la recepción biométrica', error);
        });
    }, 0);
  } catch (error) {
    console.error('[instrumentation] No se pudo cargar la recepción biométrica', error);
  }
}
