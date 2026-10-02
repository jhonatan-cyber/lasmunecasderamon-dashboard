# Reloj del lector de asistencia

La asistencia SIEMPRE se decide con la hora del servidor
(`getNowInBusinessTimezone()`, ver `processBiometricEvent.ts`), así que un
lector con el reloj mal no corrompe datos: el problema es de **auditoría** —
`biometric_events.fecha_dispositivo` guarda la hora que reportó el equipo y si
su reloj va mal esa columna deja de ser comparable. El 2026-10-02 el
DHI-ASI3213A-W amaneció con **1 hora exacta de atraso** (-3601 s), visible en el
panel de estado («Desfase del reloj»).

## Sincronización automática

`lib/biometric/clockSync.ts` corrige el reloj del lector con la hora del
servidor:

- `recordPoller.ts` llama
  `quizasSincronizarReloj(dispositivoId, serial, desfase)` (fire-and-forget) al
  procesar un registro con usuario. El desfase es el mismo que mide el panel:
  `fecha_recepcion − fecha_dispositivo` del registro recién procesado (incluye
  el retardo del poller, ≈15 s).
- Solo actúa si el desfase supera **5 minutos** (para no corregir por el retardo
  normal del poller) y pasó un **cooldown de 6 h** por equipo.
- NUNCA lanza: es mantenimiento de fondo; los fallos van al log
  `[biometric-clock]`.
- Corregir el reloj en cualquier dirección NO pierde registros: el watermark del
  poller es `MAX(rec_no)` (contador, no tiempo).
- El dedupe técnico del poller/listener usa la hora del dispositivo y es
  anterior a la corrección, por lo que tampoco se ve afectado.

## Cómo se le ajusta la hora (hallazgos de hardware)

Todo lo siguiente se comprobó contra el ASI3213A-W real y su `dhnetsdk.dll`
(SmartPSS Lite):

- **`CLIENT_SetupDeviceTime` es la vía correcta** y FUNCIONA en este firmware:
  recibe el handle de sesión y un `NET_TIME` de **6 DWORD little-endian** (año,
  mes, día, hora, minuto, segundo = 24 bytes, no 32).
- **`CLIENT_QueryDeviceTime`** lee la hora de pared del equipo con el mismo
  struct (24 bytes): es como la prueba real y cualquier diagnóstico miden el
  desfase reloj-contra-reloj.
- **El control 121 (`EM_CONTROL_DEV_TIME` de `CLIENT_ControlDevice`) está
  RECHAZADO por este firmware**: responde `false` con `lastError = 2147483655`
  (`0x80000007`, «not supported»). Queda solo como respaldo por si alguna
  variante de la DLL no exporta la función canónica.
- **Los CGI de hora no existen en este firmware**: `magicBox.cgi?action=getTime`
  responde `Error / Not Implemented!` (también con `&utc=true`) y
  `configManager.cgi?action=getConfig&name=Time`, `Error / Bad Request!`.
  Cualquier diagnóstico de reloj debe ir por NetSDK, no por CGI.
- Esta variante de la DLL **no exporta** `CLIENT_GetDeviceTime` /
  `CLIENT_SetDeviceTime` (sí las canónicas `Query…`/`Setup…`).
- `koffi` lanza «Cannot find function …» al pedir un símbolo que la DLL no
  exporta: `intentarFunc()` lo convierte en `null` para elegir el respaldo sin
  reventar.

Verificación real
(`AUDIO_REAL=1 npx vitest run tests/unit/lib/biometric/clockReal.test.ts`):
desfase **-3601 s → -1 s** en el mismo proceso, con `CLIENT_SetupDeviceTime OK`.

## Estado en el panel

`statusService.ts` agrega
`AVG(EXTRACT(EPOCH FROM (fecha_recepcion - fecha_dispositivo)))` de los eventos
de las últimas 24 h por serial y lo expone como `EstadoLector.desfase`;
`components/settings/BiometricStatus.tsx` lo pinta (ámbar pasado los 300 s).
Tras una corrección el valor baja solo cuando entran eventos nuevos con la hora
ya corregida.

## Pruebas

```bash
# Unitarias (mockean la DLL; nunca tocan hardware):
npx vitest run tests/unit/lib/biometric/clockSync.test.ts

# Real (equipo encendido y en red + DB real vía dotenv):
AUDIO_REAL=1 npx vitest run tests/unit/lib/biometric/clockReal.test.ts
```

Sondas de diagnóstico en `_tmp_real/`: `probe_clock_sync.mjs` (control 121 + CGI
crudos, documenta el rechazo) y `probe_clock_setup.mjs`
(`QueryDeviceTime`/`SetupDeviceTime`). La fuente de la API canónica son los
wrappers Java oficiales del SDK (`_tmp_real/NetSDKLib.java`).
