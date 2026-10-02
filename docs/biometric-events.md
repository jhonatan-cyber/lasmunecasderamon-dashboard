# Eventos del lector Dahua

El video RTSP y las marcaciones son canales independientes. Que el CGI emita
heartbeats no confirma que emita eventos de acceso.

## Recepción

1. En Windows x64 y Linux x64, el supervisor intenta NetSDK mediante
   `CLIENT_RealLoadPictureEx` (canal 0, `EVENT_IVS_ALL`, sin imágenes). Se
   utiliza `koffi` y la librería instalada con SmartPSS Lite (`dhnetsdk.dll` o
   `libdhnetsdk.so`), en un proceso separado del SDK de enrolamiento.
   `DAHUA_SDK_DIR` permite cambiar la carpeta.
2. Cada aviso nativo solicita los registros de acceso tras 100 ms y nuevamente
   un segundo después, para dar tiempo al equipo a persistirlos. Las ráfagas se
   agrupan; son los registros del lector los que identifican persona y hora. Un
   aviso genérico por sí solo nunca genera una asistencia.
3. Si NetSDK no inicia, se intenta `snapManager.cgi?action=attachFileProc` y
   después `eventManager.cgi?action=attach`. El parser acepta campos anidados,
   eventos JSON y fragmentos de red; descarta las imágenes adjuntas.
4. El poller de 15 segundos permanece como recuperación. Todas las lecturas de
   un mismo dispositivo comparten la operación en curso y la deduplicación
   existente. Se mantienen las reglas de usuario activo y ventana de asistencia.

Las credenciales del SDK se pasan por stdin, nunca por argumentos ni logs. El
supervisor reconecta tras una caída. Al apagar el recolector se cierra la
suscripción y el proceso auxiliar. `BIOMETRIC_EVENTS_SDK=false` fuerza CGI. El
despliegue debe incluir `scripts/biometric-events-sdk.cjs` (lo copia
`deploy.yml`), `koffi` y la librería nativa del SDK en `DAHUA_SDK_DIR`.

## Validación física

El 2026-10-01, con una persona frente al DHI-ASI3213A-W, se recibieron varios
callbacks NetSDK de código 516 (0x204). Se comprobaron también nuevos registros
de reconocimiento facial en la auditoría del sistema, con resultado `duplicado`
porque la persona ya tenía asistencia para la fecha procesada. La recepción de
eventos nativos está confirmada; no se midió la latencia extremo a extremo.

Ambas rutas CGI aceptaron la conexión y enviaron heartbeats en la prueba previa;
no se ha confirmado la entrega de marcaciones por esas rutas.

La aceptación de la asistencia depende de la ventana horaria configurada; un
evento fuera de horario puede recibirse correctamente y no generar asistencia.

### Rechazo en la pantalla del lector

Recibir un evento o reconocer un UserID no confirma una marcación aceptada por
el terminal. En la prueba del 2026-10-01 los registros de la persona 1005 tenían
`Status=0, ErrorCode=16` (sin autorización). Su perfil carecía de canales,
horarios y vigencia. Se completaron esos campos por NetSDK y se verificó
mediante una lectura posterior que el lector los conserva. Queda pendiente
comprobar una nueva marcación física aceptada.

El alta de personas ahora completa los permisos faltantes para este lector de
uso exclusivo de asistencia: canal 0, horario 255 y vigencia de diez años. Para
personas existentes se conserva el buffer original y no se reemplazan permisos
ni fechas ya configurados, incluso si la vigencia terminó.

La configuración `AttendanceModeState` también selecciona automáticamente
`OutWorkBreakOut` entre las 10:00 y las 12:59. El texto «escape» reportado
podría corresponder a ese estado; no se confirmó su traducción en la pantalla
física.

Referencia: guía Dahua Access Control Products Integration Instruction,
secciones SDK Integration y Subscribe to real-time events.
https://files.dahua.support/Solutions/Access%20Control%20Solution/Integration/DAHUA%20ACCESS%20CONTROL%20PRODUCTS%20INTEGRATION%20INSTRUCTION%20Ver1.0.pdf
