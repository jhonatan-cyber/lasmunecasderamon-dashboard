# Video del lector en enrolamiento

El diálogo abre `GET /api/biometric/devices/:id/video`, protegido con sesión y
acceso de administrador. El servidor conecta por RTSP/TCP al canal principal del
lector, puerto 554, y convierte el video a MJPEG (640 px de ancho, 15 FPS). El
navegador consume los fotogramas en una sola respuesta HTTP. La captura de la
foto de ficha sigue usando el endpoint de fotografía existente.

`pnpm install` instala el ejecutable de `ffmpeg-static`. Opcionalmente se puede
configurar `BIOMETRIC_FFMPEG_PATH` con un ejecutable propio. Reiniciar Next.js
después de instalar esta dependencia/cambiar su configuración. El servidor debe
tener acceso a la red del lector; no se envían sus credenciales al cliente.

Se requiere un proceso Node.js persistente con permiso para ejecutar FFmpeg. En
un proxy inverso, desactivar el buffering para esta ruta y permitir respuestas
de larga duración. La respuesta incluye `X-Accel-Buffering: no` y
`Cache-Control: no-store, no-transform`. No se necesita abrir un puerto nuevo
del dashboard ni configurar un servidor WebRTC.

Pausar, cerrar el diálogo u ocultar la pestaña cancela la conexión. El proceso
también se cierra si deja de producir datos. El cliente reintenta después de dos
segundos si falla el flujo. Se admiten hasta tres vistas por lector y proceso
del servidor; cada vista utiliza una conexión y un proceso FFmpeg.

Verificado en el ASI3213A-W: RTSP principal y secundario entregan video. El CGI
MJPEG directo no respondió, por eso se utiliza la conversión RTSP.
