# Calendario · Una sola clave de día

Objetivo: que la clave de día de un calendario no dependa de si el dato viene
como instante o como hora de pared, y que el detalle del cajero sume lo mismo a
cualquier hora y en cualquier zona horaria.

Rama: `main`. Runner: `corepack pnpm vitest run`.

## Specs

- **S1** — `toDateKey` aplica un solo criterio: un texto con zona explícita (`Z`
  o `±hh:mm`) es un **instante** y se traduce al día local, igual que un `Date`;
  un texto sin zona es la **hora de pared** y se lee tal cual, sin convertirla.
  Hoy el texto con zona se leía por sus primeros diez caracteres (el día UTC) y
  el `Date` por su día local: dos criterios para lo mismo.
- **S2** — El detalle del cajero suma asistencia, anticipos, propinas y horas
  extras sin depender de la hora ni de la zona del proceso. El test se puede
  reproducir con `TZ=Pacific/Honolulu` (UTC−10) o con `TZ=UTC`: en ambos casos
  el total es el mismo.
- **S3** — Los textos naive que entrega la API (la hora de pared del negocio,
  `"2026-10-20 21:30:00"`) siguen devolviendo su propia fecha, y un `Date` sigue
  devolviendo su día local.

Fuera de alcance: la diferencia entre la zona horaria del negocio y la del
navegador cuando la máquina no está en esa zona. Es un problema aparte del
calendario de roles y no lo introduce este cambio.

## Tasks

| ID  | Specs  | Ruta   | Riesgo | Commit                                                                   |
| --- | ------ | ------ | ------ | ------------------------------------------------------------------------ |
| T1  | S1, S3 | inline | none   | `fix(calendario): una sola clave de día para instantes y horas de pared` |
| T2  | S2     | inline | none   | (mismo commit: el test del cajero es la prueba de la regla)              |

Verificación:
`corepack pnpm vitest run tests/unit/lib/utils/calendarUtils.test.ts tests/unit/hooks/useRoleCalendar-cajero.test.tsx`
y, para la prueba de que no depende de la zona, la misma suite con
`TZ=Pacific/Honolulu` y con `TZ=UTC`.

## Log

- **L1** (2026-10-20) — "soluciona ambos". El primer tema es la clave de día del
  calendario de roles: `useRoleCalendar-cajero` fallaba con 12000 en vez de
  15000 entre las 20:00 y las 24:00 en UTC−4.
- **L2** (2026-10-20) — La causa no es solo el test: `toDateKey` usa el día
  local para un `Date` y el día UTC para un texto con zona. La API entrega horas
  de pared, pero cualquier cliente que mande un instante (un `toISOString()`)
  recibe el día equivocado. La regla se unifica: instante → día local; hora de
  pared → su propia fecha.
- **L3** (2026-10-20) — La CI corre con `TZ: UTC`, por eso nunca lo vio: con
  local igual a UTC los dos criterios coinciden.
- **L4** (2026-10-20) — Verificación: el test del cajero y el de `calendarUtils`
  pasan 32/32 en cinco zonas (UTC, Pacific/Honolulu UTC−10, Asia/Tokyo UTC+9,
  America/Santiago, Pacific/Kiritimati UTC+14). Antes del cambio, Honolulu
  fallaba con 12000 en vez de 15000.
- **L5** (2026-10-20) — El primer test que escribí para la regla repetía el
  error del código (usaba `toISOString()` para calcular el "día local"). El
  helper del test calcula el día local con `getFullYear/getMonth/getDate`, sin
  pasar por UTC.
