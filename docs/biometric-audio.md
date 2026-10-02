# Audio del lector de asistencia

## Envío desde el sistema (arquitectura vigente)

Los MP3 viven en `public/audio` y **no se cargan en el equipo**: el servidor los
convierte a PCM s16le mono 16 kHz con `ffmpeg-static` y los manda al altavoz por
el **streaming Talk del NetSDK**. Los slots `/AudioFilePath/` del lector quedan
quietos (hoy contienen silencio, ver más abajo).

Mapeo decidido con el negocio (`lib/biometric/audioService.ts`):

| Resultado del flujo                 | MP3 en `public/audio`        |
| ----------------------------------- | ---------------------------- |
| asistencia registrada               | `asistenciaRegistrada.mp3`   |
| ya tenía asistencia hoy (duplicado) | `asistenciaYaRegistrada.mp3` |
| fuera de la ventana horaria         | `horaFinalizada.mp3`         |
| código sin usuario                  | `usuarioNoRegistrado.mp3`    |
| alta/enrolamiento exitoso           | `usuarioRegistrado.mp3`      |
| persona inactiva                    | (sin audio)                  |
| salida (Type=Exit)                  | (sin audio)                  |

Módulos:

- `lib/biometric/audioLib.ts` — núcleo puro (structs + `reproducirAudio` con
  reloj absoluto). Recibe un `NetSdk` inyectado: se testea sin hardware.
- `lib/biometric/audioSdk.ts` — puente koffi (`conectarSdk`), comparte la
  librería con el puente facial y con la sincronización de reloj.
- `lib/biometric/audioService.ts` — catálogo, MP3→PCM y envío; **nunca lanza**.
- `lib/biometric/avisosAudio.ts` — resuelve credenciales frescas de la DB y
  dispara el aviso; **fire-and-forget** y **cola por equipo** (el Talk admite
  una sesión a la vez: dos marcaciones seguidas no se pisan).

Disparos:

- `procesarEventoBiometrico` avisa `registrado` / `duplicado` / `fuera_ventana`
  / `sin_usuario` después de registrar y auditar (sin `await`).
- `enrollmentService` avisa el alta exitosa: `sincronizarPersona` (ok),
  `restaurarEnEquipo` (ok, con `avisar: false` para la re-sincronización masiva,
  que suena **una sola vez** al terminar) y `darDeAltaConFoto`.
- Las salidas del lector no suenan: no son un resultado del flujo de asistencia.

Pruebas: `tests/unit/lib/biometric/audioLib.test.ts`, `audioService.test.ts` y
`avisosAudio.test.ts` cubren structs, secuencia, reloj absoluto, catálogo y
fallos. La prueba REAL contra el equipo (suena en la puerta) va aparte:

```bash
AUDIO_REAL=1 npx vitest run tests/unit/lib/biometric/audioReal.test.ts
```

## Estado comprobado del dispositivo (2026-10-02)

El usuario confirmo que el audio enviado desde el sistema se escucha normal por
Talk, con cabecera PCM a 16 kHz y paquetes temporizados de 25 ms. No hace falta
guardar esos audios en el dispositivo.

Los cambios en `Sound.UnlockSoundEnable`, `Sound.AlarmSoundEnable` y
`AccessControlGeneral.AccessVoice.CurrentVoiceID=8` quedaron guardados, pero el
usuario confirmo que NO eliminaron el aviso "asistencia fallida". Se probo
tambien `Sound.SilentMode=true`: el audio externo siguio sonando, pero persistio
el aviso nativo. No asumir que esos indicadores lo silencian.

## Reemplazos de los avisos nativos

`speak.getCaps` devuelve exactamente estos nombres de personalizacion:
`OpenSuccess`, `OpenFail`, `NoMask`. Se cargaron MP3 silenciosos de 1 segundo,
mono 16 kHz, 32 kbps, sin metadatos, con los nombres correspondientes:

| Archivo verificado en el lector  | Contenido | Bytes |
| -------------------------------- | --------- | ----: |
| `/AudioFilePath/OpenSuccess.mp3` | silencio  |  4320 |
| `/AudioFilePath/OpenFail.mp3`    | silencio  |  4320 |
| `/AudioFilePath/NoMask.mp3`      | silencio  |  4320 |

La lectura posterior de `FileManager.list` confirma los tres archivos (y que los
viejos `registro.mp3`/`yaregistrado.mp3`/`hora.mp3` ya no están). **Falta
confirmacion fisica de que estos reemplazos apagaron la voz nativa.**

Para liberar los tres espacios se eliminaron los archivos silenciosos
`registro.mp3`, `yaregistrado.mp3` y `hora.mp3` que se habian cargado antes.
Esos nombres no corresponden a los avisos personalizados del firmware. Los
originales del sistema permanecen en `public/audio`.

## Modo DND (tercera capa, 2026-10-02)

La interfaz web del equipo expone un interruptor que las sondas anteriores no
habian tocado: **Modo DND**, en _Configuración de Audio y Video → Audio_. Se
activo **24/7** (Periodo 1: 00:00-23:59) y quedo verificado por lectura:

```json
{"AccessDNDMode": {"Enable": true, "TimeSection": ["1 00:00:00-23:59:00", ...]}}
```

Es la unica palanca de silencio que la propia UI ofrece, asi que es la que
"deberia" callar los avisos; junto con los MP3 nativos ya reemplazados por
silencio y los indicadores de `Sound`, el equipo quedo configurado al maximo de
silencio posible desde software. **Sigue faltando la confirmacion fisica** (una
marcacion correcta y un codigo inexistente delante del equipo).

Para revertir: apagar el interruptor en esa misma pantalla y pulsar Aplicar (o
`configManager.setConfig` con `AccessDNDMode.Enable=false`).

## Acceso remoto comprobado

Las conclusiones anteriores de que el firmware no permitia escritura de
configuracion ni borrado de archivos eran incorrectas. La sesion autenticada
RPC2 permite:

- `configManager.getConfig` y `configManager.setConfig` con `{name, table}`.
- `FileManager.factory.instance`, luego `FileManager.removeFiles` con
  `{fileName: [ruta]}` y el identificador `object` de la instancia.
- `FileManager.list` para verificar los archivos.
- La carga por `CLIENT_UploadRemoteFile` de NetSDK.

OJO con los nombres de metodo: `configManager.getConfigByName` y el CGI
`configManager.cgi?action=setConfig` NO existen en este firmware ("Method not
found" / 400 Bad Request); la via que si funciona es `POST /RPC2` con la sesion
de `global.login`, como hace su propia web.

`_tmp_real/probe_voz_rpc2.mjs` aplica y verifica el silencio completo (DND
24/7 + tabla `Sound`) sin navegador; `_tmp_real/probe_voz.cgi.mjs` y
`_tmp_real/probe_voz_sdk.mjs` dejan registrados los caminos que NO funcionan
(CGI y `CLIENT_GetNewDevConfig("Sound")`).

Los parametros nativos actuales son `SilentMode=true`,
`UnlockSoundEnable=false`, `AlarmSoundEnable=false`, `TouchScreenSound=false`,
`CurrentVoiceID=8`, `AccessDNDMode.Enable=true` y volumen 100. Los respaldos
previos estan en `.dev/native-audio-before-<fecha>.json` y
`.dev/sound-before-silent-<fecha>.json`. Las copias silenciosas estan en
`.dev/biometric-audio`.

## Historial

El servicio de audio basado en **cargar archivos al lector** fue retirado
(`scripts/biometric-audio.cjs`, la ruta `/api/biometric/devices/[id]/audio` y
sus tests): el firmware solo admite 3 personalizaciones y pisarlas era
destructivo. La arquitectura vigente manda el audio por Talk desde el sistema,
sin tocar los slots del equipo.
