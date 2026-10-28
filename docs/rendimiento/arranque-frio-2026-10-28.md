# Arranque en frío: apagar los lectores biométricos baja el primer health de 32,6 s a 17,2 s

Fecha: 28/10/2026. La recepción automática de lectores (poller, listeners en
vivo y vigilancia de IP) se encendía en `instrumentation.ts` y su grafo tardaba
~26,5 s en estar listo en un arranque en frío. Ahora está apagada por defecto
(`BIOMETRIC_RECEPTION`), y con el mismo arnés la primera respuesta útil baja de
**32,64 s a 17,24 s** y `/login` de **46,15 s a 31,27 s** (medianas frías). El
enrolamiento facial desde el teléfono no cambia: lo atiende
`/api/users/[id]/biometric/captures` bajo demanda.

## Resultado

Frío = se elimina `.next` antes de cada corrida. Mediana [mín-máx] de 3 corridas
por lado, todas desde el `spawn` del servidor.

| Métrica                      | Con recepción (antes) | Sin recepción (ahora) | Δ mediana |
| ---------------------------- | --------------------: | --------------------: | --------: |
| `Ready` (línea de Next)      |    2,73 s [2,43-3,49] |    2,05 s [1,96-3,01] |    -24,8% |
| `/api/health` con HTTP 200   | 32,64 s [25,56-35,54] | 17,24 s [16,32-31,09] |    -47,2% |
| `/login` con HTTP 200        | 46,15 s [41,98-49,89] | 31,27 s [27,81-41,57] |    -32,2% |
| `/login` menos `/api/health` | 14,34 s [13,51-16,42] | 10,57 s [10,47-14,94] |    -26,3% |
| Instrumentación disponible   | 26,51 s [17,22-26,84] | 11,27 s [11,08-20,17] |    -57,5% |

Con la caché templada (`ready` conservado) la diferencia casi desaparece:
`/api/health` 20,65 s con recepción y 18,13 s sin ella. El ahorro real está en
el arranque en frío, que es el que paga la compilación del grafo completo.

En la corrida sin recepción, `[instrumentation]` ya sólo marca cuándo Next
compila y ejecuta el módulo —que ahora sólo imprime "desactivada"—; el import de
recepción, el motor facial, FFmpeg y el cliente del lector no se cargan.

## Qué cambió

| Cambio                                                            | Efecto                                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `instrumentation.ts` sale temprano salvo `BIOMETRIC_RECEPTION=on` | El grafo biométrico no se compila ni se ejecuta al arrancar        |
| `.env.example` documenta el interruptor                           | Se puede volver al comportamiento anterior sin tocar código        |
| Tests del arranque ampliados                                      | Cubren por defecto apagado, `on`, apagado explícito y runtime Edge |

Lo que sigue funcionando igual:

- **Enrolamiento facial desde el teléfono**:
  `POST /api/users/[id]/biometric/captures` guarda la plantilla en la base al
  llamarlo; no depende de la recepción.
- **Encender lectores a mano**: Configuraciones → Asistencia usa
  `/api/biometric/reception`, que arranca los subsistemas en ese proceso aunque
  el flag esté apagado. El flag gobierna sólo el arranque automático.

## Cómo se midió

| Tema       | Detalle                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| Comando    | `pnpm benchmark:arranque --cold 3 --warm 2`                                                                  |
| Arnés      | `scripts/benchmark-arranque.mjs`                                                                             |
| Servidor   | `node scripts/dev-lan-auto.js`, puerto 3000, warmup desactivado                                              |
| Frío       | Elimina `.next` antes de cada corrida                                                                        |
| Templado   | Conserva `.next` de la última corrida fría                                                                   |
| Peticiones | HTTP real a `127.0.0.1`; health primero y login después                                                      |
| Entorno    | Windows 10.0.26300 x64, Node v24.20.0, Next 16.4.2, AMD Ryzen 5 7520U, 8 núcleos, 7,2 GB RAM                 |
| Código     | commit base `d6bdab88` con los cambios locales de esta ronda                                                 |
| Evidencia  | [recepción on](arranque-frio-2026-10-28.json) · [recepción off](arranque-frio-recepcion-off-2026-10-28.json) |

## Límites

- Tres corridas frías por lado en una sola máquina, en dos sesiones separadas.
  La varianza es alta (health frío con recepción: 25,56-35,54 s; sin recepción:
  16,32-31,09 s) y una corrida lenta puede desplazar la mediana. No son
  percentiles de producción.
- "Frío" significa `.next` eliminado, no una máquina recién reiniciada: la caché
  del sistema operativo y la de Node siguen activas.
- El tiempo restante (~17 s hasta el primer health) es la compilación del grafo
  de rutas por Turbopack con el caché vacío; ya no incluye biométrica.
- `pnpm dev` ejecuta además `node scripts/generate-sw.js --dev` antes de este
  arranque; ese paso no está incluido.
- No se mide `next build`/`next start` ni el navegador; el warmup automático
  quedó desactivado en todas las corridas.

## Cómo repetirlo

Detén el servidor de desarrollo: el benchmark elimina `.next` y exige el puerto
libre.

```powershell
corepack pnpm benchmark:arranque --cold 3 --warm 2 --json docs/rendimiento/arranque-frio-recepcion-off-2026-10-28.json
```

## Artefactos

- [Evidencia con recepción](arranque-frio-2026-10-28.json)
- [Evidencia sin recepción](arranque-frio-recepcion-off-2026-10-28.json)
- [Benchmark](../../scripts/benchmark-arranque.mjs)

## Próximo paso

Con los lectores apagados, el arranque en frío ya no depende de biométrica; lo
que queda (~17 s) es compilación de rutas en Turbopack, medible con este mismo
benchmark. Si algún día hay lectores conectados, `BIOMETRIC_RECEPTION=on`
recupera el comportamiento anterior a costa de ese arranque más lento.
